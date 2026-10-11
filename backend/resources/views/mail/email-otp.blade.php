<x-mail::message>
# Salam,

{{ $intentMs }}

<x-mail::code :code="$code" />

Kod ini sah selama {{ $minutes }} minit. Jangan kongsikan kod ini dengan sesiapa. Jika bukan anda yang meminta, abaikan e-mel ini.

---

{{ $intentEn }} It is valid for {{ $minutes }} minutes. Do not share it with anyone. If you did not ask for it, you can ignore this email.

{{ $brand }}
</x-mail::message>
