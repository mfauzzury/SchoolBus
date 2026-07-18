import { useQuery } from '@tanstack/react-query'
import { listOperatorStudents, type StudentFilters } from '@/api/operatorStudents'

export function useOperatorStudents(filters: StudentFilters) {
  return useQuery({
    queryKey: ['operator-students', filters],
    queryFn: () => listOperatorStudents(filters),
  })
}
