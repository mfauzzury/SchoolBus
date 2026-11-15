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

        // Children whose own route is replaced by rides on this trip's direction today (a subquery, not a list of ids).
        $replaced = StudentRide::where('direction', $trip->direction)->activeOn($day)->select('student_id');

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
                'transit' => null,
            ]);

        $changed = StudentRide::where('route_id', $trip->route_id)
            ->where('direction', $trip->direction)
            ->activeOn($day)
            ->whereHas('student', fn ($q) => $q->where('enrollment_status', 'active'))
            ->with([
                'student' => fn ($q) => $q->with($relations),
                'boardStop:id,name,sequence,transit_center_id',
                'alightStop:id,name,sequence,transit_center_id',
                'transitRequest:id,leave_center_at',
            ])
            ->get()
            ->unique('student_id')
            ->map(function (StudentRide $ride) use ($trip) {
                $transit = $this->transitNote($ride);

                return [
                    'student' => $ride->student,
                    'board_stop' => $ride->boardStop,
                    'alight_stop' => $ride->alightStop,
                    // The stop on this route where the driver deals with the child, which also
                    // sets their place in the list. Collecting a child from a center happens at the center.
                    'stop' => match (true) {
                        ($transit['action'] ?? null) === 'pick' => $ride->boardStop,
                        $trip->direction === 'pickup' => $ride->boardStop ?? $ride->alightStop,
                        default => $ride->alightStop ?? $ride->boardStop,
                    },
                    'transit' => $transit,
                ];
            });

        return $usual->concat($changed)
            ->sortBy(fn (array $row) => $row['stop']?->sequence)
            ->values();
    }

    /**
     * What the driver needs to know when a child goes via a transit center on
     * this trip: drop them at the center, or pick them up there (and when).
     *
     * @return array{action: string, center_name: string, leave_center_at: ?string}|null
     */
    private function transitNote(StudentRide $ride): ?array
    {
        if ($ride->alightStop?->transit_center_id) {
            return ['action' => 'drop', 'center_name' => $ride->alightStop->name, 'leave_center_at' => null];
        }

        if ($ride->boardStop?->transit_center_id) {
            return ['action' => 'pick', 'center_name' => $ride->boardStop->name, 'leave_center_at' => $ride->transitRequest?->leave_center_at];
        }

        return null;
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
