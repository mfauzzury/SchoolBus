<?php

namespace App\Services;

use App\Models\RouteStop;
use App\Models\Student;
use App\Models\StudentRide;
use App\Models\Trip;
use Illuminate\Support\Collection;

/**
 * Works out which children ride a trip, and where each one gets on and off.
 *
 * A child rides their own route in both directions unless they have rides
 * (student_rides) for that direction on the trip's day; then those rides
 * decide which route(s) carry them instead. This is how a child can go from
 * school to a transit center on one bus and home on another.
 */
class TripRoster
{
    /**
     * @return Collection<int, array{student: Student, board_stop: ?RouteStop, alight_stop: ?RouteStop, stop: ?RouteStop}>
     */
    public function for(Trip $trip): Collection
    {
        $day = $trip->created_at ?? now();

        $replaced = StudentRide::where('direction', $trip->direction)
            ->activeOn($day)
            ->pluck('student_id')
            ->unique();

        $relations = ['parentProfile:id,full_name,phone,email', 'pickupStop:id,name,sequence'];

        // Only children who still ride: a suspended or withdrawn child is not waiting at a stop.
        $usual = $trip->route->students()
            ->where('enrollment_status', 'active')
            ->whereNotIn('id', $replaced)
            ->with($relations)
            ->get()
            ->map(fn (Student $student) => [
                'student' => $student,
                'board_stop' => $trip->direction === 'pickup' ? $student->pickupStop : null,
                'alight_stop' => $trip->direction === 'dropoff' ? $student->pickupStop : null,
                'stop' => $student->pickupStop,
            ]);

        $changed = StudentRide::where('route_id', $trip->route_id)
            ->where('direction', $trip->direction)
            ->activeOn($day)
            ->whereHas('student', fn ($q) => $q->where('enrollment_status', 'active'))
            ->with(['student' => fn ($q) => $q->with($relations), 'boardStop:id,name,sequence', 'alightStop:id,name,sequence'])
            ->get()
            ->unique('student_id')
            ->map(fn (StudentRide $ride) => [
                'student' => $ride->student,
                'board_stop' => $ride->boardStop,
                'alight_stop' => $ride->alightStop,
                // The stop on this route where the driver deals with the child.
                'stop' => $trip->direction === 'pickup'
                    ? ($ride->boardStop ?? $ride->alightStop)
                    : ($ride->alightStop ?? $ride->boardStop),
            ]);

        return $usual->concat($changed)
            ->sortBy(fn (array $row) => $row['stop']?->sequence)
            ->values();
    }

    public function includes(Trip $trip, Student $student): bool
    {
        $day = $trip->created_at ?? now();

        $rides = StudentRide::where('student_id', $student->id)
            ->where('direction', $trip->direction)
            ->activeOn($day)
            ->pluck('route_id');

        return $rides->isEmpty()
            ? $student->route_id === $trip->route_id
            : $rides->contains($trip->route_id);
    }
}
