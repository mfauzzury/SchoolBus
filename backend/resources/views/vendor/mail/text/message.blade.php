<x-mail::layout>
    {{-- Header: the website (the app people use), not this API server --}}
    <x-slot:header>
        <x-mail::header :url="config('app.frontend_url')">
            {{ \App\Support\Brand::name() }}
        </x-mail::header>
    </x-slot:header>

    {{-- Body --}}
    {{ $slot }}

    {{-- Subcopy --}}
    @isset($subcopy)
        <x-slot:subcopy>
            <x-mail::subcopy>
                {{ $subcopy }}
            </x-mail::subcopy>
        </x-slot:subcopy>
    @endisset

    {{-- Footer --}}
    <x-slot:footer>
        <x-mail::footer>
            E-mel ini dihantar secara automatik. / This email was sent automatically. © {{ date('Y') }} {{ \App\Support\Brand::name() }}
        </x-mail::footer>
    </x-slot:footer>
</x-mail::layout>
