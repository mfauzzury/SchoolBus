@props(['url'])
@php($logo = \App\Support\Brand::logoUrl())
{{-- The Owner's wide logo when there is one (PNG: mail apps can't show SVG), with the name as its alt text for
     mail apps that block images. Otherwise the built-in mark (two stops joined by a route) and name, drawn with
     table cells so it shows even when images are blocked. --}}
<tr>
<td class="header" align="center">
<a href="{{ $url }}" style="display: inline-block;">
@if ($logo)
<img src="{{ $logo }}" alt="{{ trim(strip_tags((string) $slot)) }}" height="40" style="display: block; height: 40px; width: auto; max-width: 240px; border: 0;">
@else
<table class="brand" align="center" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td class="brand-mark" width="32" height="32" align="center" valign="middle">
<table align="center" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td width="5" height="5" valign="middle"><div class="brand-dot">&nbsp;</div></td>
<td width="10" height="5" valign="middle" style="padding: 0 1px;"><div class="brand-line">&nbsp;</div></td>
<td width="5" height="5" valign="middle"><div class="brand-dot">&nbsp;</div></td>
</tr>
</table>
</td>
<td class="brand-name" valign="middle">{!! $slot !!}</td>
</tr>
</table>
@endif
</a>
</td>
</tr>
