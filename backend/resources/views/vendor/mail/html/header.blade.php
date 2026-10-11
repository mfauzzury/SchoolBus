@props(['url'])
{{-- The brand mark (two stops joined by a route) and name, drawn with table cells so it shows even when a mail app blocks images. --}}
<tr>
<td class="header" align="center">
<a href="{{ $url }}" style="display: inline-block;">
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
</a>
</td>
</tr>
