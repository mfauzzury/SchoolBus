import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Mail } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { useSubmitContactMessage } from '@/hooks/useContact'
import { cn } from '@/lib/utils'

const SUPPORT_EMAIL = 'hello@bassekolah.my'

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(1),
})

type ContactForm = z.infer<typeof contactSchema>

export function Contact() {
  const { t } = useTranslation()
  const submit = useSubmitContactMessage()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactForm>({ resolver: zodResolver(contactSchema) })

  const onSubmit = (values: ContactForm) => {
    submit.mutate(values, { onSuccess: () => reset() })
  }

  return (
    <div className="mx-auto max-w-2xl px-6">
      <section className="flex flex-col items-center gap-5 py-24 text-center">
        <span className="flex items-center gap-2 text-xs font-bold tracking-wider text-primary uppercase">
          <span className="size-1.5 rounded-full bg-primary" />
          {t('contact.eyebrow')}
        </span>
        <h1 className="max-w-lg text-4xl leading-tight font-medium text-balance sm:text-5xl">
          {t('contact.headline')}
        </h1>
        <p className="max-w-md text-balance text-muted-foreground">{t('contact.description')}</p>

        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className={cn(buttonVariants({ variant: 'outline' }), 'mt-2')}
        >
          <Mail />
          {SUPPORT_EMAIL}
        </a>

        <Card className="mt-6 w-full text-left">
          <CardContent>
            {submit.isSuccess ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="size-8 text-primary" />
                <p className="font-medium">{t('contact.form.successTitle')}</p>
                <p className="text-sm text-muted-foreground">{t('contact.form.successDescription')}</p>
              </div>
            ) : (
              <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">{t('contact.form.name')}</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">{t('contact.form.email')}</Label>
                  <Input id="email" type="email" {...register('email')} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="phone">{t('contact.form.phone')}</Label>
                  <Input id="phone" {...register('phone')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="message">{t('contact.form.message')}</Label>
                  <Textarea id="message" rows={5} {...register('message')} />
                  {errors.message && (
                    <p className="text-sm text-destructive">{errors.message.message}</p>
                  )}
                </div>
                {submit.isError && (
                  <p className="text-sm text-destructive">{t('contact.form.failed')}</p>
                )}
                <Button type="submit" disabled={submit.isPending}>
                  {submit.isPending ? t('contact.form.submitting') : t('contact.form.submit')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">{t('contact.responseNote')}</p>
      </section>
    </div>
  )
}
