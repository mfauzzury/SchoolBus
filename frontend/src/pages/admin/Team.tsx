import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useChangeTeamLevel,
  useDeactivateTeamMember,
  useReactivateTeamMember,
  useTeam,
} from '@/hooks/useAdmin'
import { useMe } from '@/hooks/useAuth'
import { TEAM_LEVELS } from '@/lib/platform'
import type { TeamMember } from '@/api/admin'

export function AdminTeam() {
  const { t } = useTranslation()
  const { data: me } = useMe()
  const { data: team, isLoading } = useTeam()
  const changeLevel = useChangeTeamLevel()
  const deactivate = useDeactivateTeamMember()
  const reactivate = useReactivateTeamMember()

  const levelLabels = Object.fromEntries(
    TEAM_LEVELS.map((level) => [level, t(`admin.team.levels.${level}`)]),
  )

  const lastLogin = (member: TeamMember) =>
    member.last_login_at ? member.last_login_at.slice(0, 10) : t('admin.team.neverLoggedIn')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-medium">{t('admin.team.title')}</h1>
        <Link to="/admin/team/new" className={buttonVariants()}>
          {t('admin.team.add')}
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.team.levelsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            {TEAM_LEVELS.map((level) => (
              <div key={level} className="flex flex-col gap-0.5">
                <dt className="font-medium">{t(`admin.team.levels.${level}`)}</dt>
                <dd className="text-muted-foreground">{t(`admin.team.levelHelp.${level}`)}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.team.name')}</TableHead>
                  <TableHead>{t('admin.team.level')}</TableHead>
                  <TableHead>{t('admin.team.lastLogin')}</TableHead>
                  <TableHead>{t('admin.team.status')}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {team?.map((member) => {
                  const isMe = member.id === me?.user.id
                  const removed = member.deactivated_at !== null

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>
                            {member.name}
                            {isMe && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                {t('admin.team.you')}
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">{member.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isMe || removed || !member.level ? (
                          <span>{member.level ? levelLabels[member.level] : '—'}</span>
                        ) : (
                          <Select
                            items={levelLabels}
                            value={member.level}
                            onValueChange={(level) =>
                              level &&
                              level !== member.level &&
                              changeLevel.mutate({
                                id: member.id,
                                level: level as TeamMember['level'] & string,
                              })
                            }
                          >
                            <SelectTrigger size="sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TEAM_LEVELS.map((level) => (
                                <SelectItem key={level} value={level}>
                                  {levelLabels[level]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>{lastLogin(member)}</TableCell>
                      <TableCell>
                        <Badge variant={removed ? 'outline' : 'success'}>
                          {removed ? t('admin.team.removed') : t('common.active')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!isMe &&
                          (removed ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={reactivate.isPending}
                              onClick={() => reactivate.mutate(member.id)}
                            >
                              {t('admin.team.restore')}
                            </Button>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger
                                render={
                                  <Button type="button" variant="outline" size="sm">
                                    {t('admin.team.remove')}
                                  </Button>
                                }
                              />
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    {t('admin.team.removeConfirm', { name: member.name })}
                                  </AlertDialogTitle>
                                </AlertDialogHeader>
                                <p className="text-sm text-muted-foreground">
                                  {t('admin.team.removeHelp')}
                                </p>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deactivate.mutate(member.id)}>
                                    {t('admin.team.remove')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ))}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}

          {(changeLevel.isError || deactivate.isError || reactivate.isError) && (
            <p role="alert" className="text-sm text-destructive">
              {t('admin.team.error')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
