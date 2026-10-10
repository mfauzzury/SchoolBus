<?php

namespace App\Http\Controllers\Api\Driver;

use App\Http\Controllers\Controller;
use App\Models\BoardingEvent;
use App\Models\Route;
use App\Models\Student;
use App\Models\Trip;
use App\Models\TripLocation;
use Illuminate\Http\Request;

class TripController extends Controller
{
    /**
     * Trips aren't pre-scheduled by any generator today — the driver's
     * assigned routes are materialized into (find-or-create) today's pickup
     * and dropoff trips on demand, the first time they're asked for each day.
     */
    public function today(Request $request)
    {
        $staff = $request->user()->staff;

        $routes = Route::where('driver_id', $staff->id)->get();

        $trips = collect();
        foreach ($routes as $route) {
            foreach (['pickup', 'dropoff'] as $direction) {
                $trip = Trip::where('route_id', $route->id)
                    ->where('direction', $direction)
                    ->whereDate('created_at', today())
                    ->first();

                if (! $trip) {
                    $trip = Trip::create([
                        'route_id' => $route->id,
                        'staff_id' => $staff->id,
                        'bus_id' => $route->bus_id,
                        'direction' => $direction,
                        'status' => 'scheduled',
                    ]);
                }

                $trips->push($trip->load('route'));
            }
        }

        return $trips->values();
    }

    public function start(Request $request, Trip $trip)
    {
        $this->authorizeTrip($request, $trip);

        $trip->update(['status' => 'active', 'started_at' => now()]);

        return $trip;
    }

    public function end(Request $request, Trip $trip)
    {
        $this->authorizeTrip($request, $trip);

        $trip->update(['status' => 'completed', 'ended_at' => now()]);

        return $trip;
    }

    public function postLocation(Request $request, Trip $trip)
    {
        $this->authorizeTrip($request, $trip);

        $data = $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'heading' => 'nullable|numeric|between:0,360',
            'speed' => 'nullable|numeric|min:0',
        ]);

        $location = TripLocation::updateOrCreate(
            ['trip_id' => $trip->id],
            [...$data, 'recorded_at' => now()],
        );

        return $location;
    }

    public function roster(Request $request, Trip $trip)
    {
        $this->authorizeTrip($request, $trip);

        $students = $trip->route->students()
            ->with(['parentProfile:id,full_name,phone,email', 'pickupStop:id,name,sequence'])
            ->get()
            ->sortBy('pickupStop.sequence')
            ->values();

        $eventsByStudent = BoardingEvent::where('trip_id', $trip->id)->get()->groupBy('student_id');

        return $students->map(function (Student $student) use ($eventsByStudent) {
            $events = $eventsByStudent->get($student->id, collect());

            // Only what the driver needs on the bus — never fees, billing or the
            // child's birth date, which the full record carries.
            return [
                'id' => $student->id,
                'full_name' => $student->full_name,
                'school_name' => $student->school_name,
                'avatar_url' => $student->avatar_url,
                'teacher_name' => $student->teacher_name,
                'class_name' => $student->class_name,
                'school_phone' => $student->school_phone,
                'parent_profile' => $student->parentProfile,
                'pickup_stop' => $student->pickupStop,
                'boarded' => $events->contains('event_type', 'boarded'),
                'alighted' => $events->contains('event_type', 'alighted'),
            ];
        })->values();
    }

    public function boardStudent(Request $request, Trip $trip, Student $student)
    {
        return $this->recordBoardingEvent($request, $trip, $student, 'boarded');
    }

    public function alightStudent(Request $request, Trip $trip, Student $student)
    {
        return $this->recordBoardingEvent($request, $trip, $student, 'alighted');
    }

    private function recordBoardingEvent(Request $request, Trip $trip, Student $student, string $eventType)
    {
        $this->authorizeTrip($request, $trip);

        if ($student->route_id !== $trip->route_id) {
            abort(422, 'This student is not on this trip\'s route.');
        }

        $event = BoardingEvent::firstOrCreate(
            ['trip_id' => $trip->id, 'student_id' => $student->id, 'event_type' => $eventType],
            ['recorded_at' => now(), 'recorded_by_staff_id' => $request->user()->staff->id],
        );

        return response()->json($event, $event->wasRecentlyCreated ? 201 : 200);
    }

    /**
     * A driver may only start/end/ping/roster/board on their own trip —
     * distinct from BelongsToTenant's resolveRouteBinding, which only
     * enforces tenant isolation, not per-driver ownership within a tenant.
     */
    private function authorizeTrip(Request $request, Trip $trip): void
    {
        if ($trip->staff_id !== $request->user()->staff->id) {
            abort(403, 'You may only act on your own trips.');
        }
    }
}
