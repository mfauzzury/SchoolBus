import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createRoute, deleteRoute, listRoutes, updateRoute, type RouteInput } from '@/api/routes'

export function useRoutes() {
  return useQuery({ queryKey: ['routes'], queryFn: listRoutes })
}

export function useCreateRoute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RouteInput) => createRoute(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routes'] }),
  })
}

export function useUpdateRoute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<RouteInput> }) =>
      updateRoute(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routes'] }),
  })
}

export function useDeleteRoute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteRoute(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routes'] }),
  })
}
