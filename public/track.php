<?php
/* BarkFlair click tracker
   Counts taps on the WhatsApp, email and phone buttons and saves them to a private file
   one level above public_html (barkflair-clicks.csv). No names, no IP addresses. */
@date_default_timezone_set('Asia/Karachi');
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); echo '{"ok":false}'; exit; }

$ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
if ($ua === '' || preg_match('/bot|crawl|spider|slurp|preview|lighthouse|headless|python|curl|wget/i', $ua)) { echo '{"ok":true}'; exit; }

// only accept clicks sent from barkflair.com pages
$origin = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
$host = preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? '');
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== $host) { echo '{"ok":true}'; exit; }

$type = $_POST['type'] ?? '';
if (!in_array($type, ['whatsapp', 'email', 'phone', 'upwork', 'instagram', 'facebook'], true)) { http_response_code(400); echo '{"ok":false}'; exit; }

$page = (string)($_POST['page'] ?? '/');
if (!preg_match('#^/[a-z0-9/_\-\.]{0,120}$#i', $page)) $page = '/';

$src = strtolower((string)($_POST['src'] ?? ''));
$known = ['instagram', 'facebook', 'google', 'bing', 'whatsapp', 'upwork', 'linkedin', 'youtube', 'tiktok', 'chatgpt', 'direct'];
if (!in_array($src, $known, true)) $src = $src === '' ? 'direct' : 'other';

$device = preg_match('/Mobi|iPhone|Android/i', $ua) ? 'mobile' : 'desktop';
// anonymous visitor id that changes every day (used only to count unique people)
$visitor = substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . $ua . '|' . date('Y-m-d') . '|bf-salt-7c1'), 0, 12);

$file = dirname(__DIR__) . '/barkflair-clicks.csv';
$fh = @fopen($file, 'a');
if ($fh && flock($fh, LOCK_EX)) {
    if (filesize($file) === 0) fputcsv($fh, ['Date', 'Type', 'Page', 'Source', 'Device', 'Visitor']);
    fputcsv($fh, [date('Y-m-d H:i:s'), $type, $page, $src, $device, $visitor]);
    fflush($fh); flock($fh, LOCK_UN); fclose($fh);
}
echo '{"ok":true}';
