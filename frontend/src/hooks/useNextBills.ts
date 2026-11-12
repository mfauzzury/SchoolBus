import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createNextBills, getNextBills, getNextBillsSummary } from '@/api/nextBills'

export function useNextBills() {
  return useQuery({ queryKey: ['next-bills'], queryFn: getNextBills })
}

/** For the menu badge and the home-page banner; cheap for operators on automatic. */
export function useNextBillsSummary() {
  return useQuery({ queryKey: ['next-bills-summary'], queryFn: getNextBillsSummary, staleTime: 60_000 })
}

export function useCreateNextBills() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createNextBills,
    onSuccess: () => {
      for (const key of ['next-bills', 'next-bills-summary', 'operator-invoices', 'dashboard-summary', 'operator-students', 'operator-outstanding']) {
        queryClient.invalidateQueries({ queryKey: [key] })
      }
    },
  })
}
