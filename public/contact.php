<?php
/* BarkFlair contact form
   Every inquiry from the website is emailed to you AND saved in a spreadsheet file.
   ------------------------------------------------------------------ SETTINGS */
$SEND_TO   = 'hello@barkflair.com';                       // where new inquiries are emailed
$SEND_FROM = 'hello@barkflair.com';                       // must be an email address on barkflair.com
$LEADS_CSV = dirname(__DIR__) . '/barkflair-leads.csv';   // saved one level above public_html (private)
$TIMEZONE  = 'Asia/Karachi';                              // time shown on each inquiry
/* ------------------------------------------------------------------ */

@date_default_timezone_set($TIMEZONE);
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false]);
    exit;
}

// Spam trap: real people never fill in this hidden field
if (!empty($_POST['_gotcha'])) {
    echo json_encode(['ok' => true]);
    exit;
}

function field($key, $max = 2000) {
    $v = $_POST[$key] ?? '';
    if (is_array($v)) $v = implode(', ', array_map('strval', $v));
    $v = trim(str_replace(["\r", "\0"], '', (string)$v));
    return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max);
}
function one_line($v) { return trim(preg_replace('/\s+/', ' ', $v)); }

$name     = one_line(field('name', 120));
$email    = one_line(field('email', 160));
$phone    = one_line(field('phone', 40));
$services = one_line(field('services', 300));
$volume   = one_line(field('videos_per_month', 80));
$message  = field('message', 5000);
$page     = one_line((string)($_SERVER['HTTP_REFERER'] ?? ''));
$ip       = (string)($_SERVER['REMOTE_ADDR'] ?? '');

if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Please add your name and a valid email.']);
    exit;
}

// Rate limit: max 5 inquiries per hour from the same visitor
$rl = rtrim(sys_get_temp_dir(), '/') . '/bf_form_' . md5($ip);
$hits = [];
if (is_file($rl)) {
    $hits = array_filter(array_map('intval', explode(',', (string)@file_get_contents($rl))), function ($t) { return $t > time() - 3600; });
}
if (count($hits) >= 5) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => 'Too many messages. Please email us instead.']);
    exit;
}
$hits[] = time();
@file_put_contents($rl, implode(',', $hits));

$when = date('Y-m-d H:i T');

// 1) Save to the spreadsheet file (opens in Excel, Numbers or Google Sheets)
$saved = false;
$fh = @fopen($LEADS_CSV, 'a');
if ($fh) {
    if (flock($fh, LOCK_EX)) {
        if (filesize($LEADS_CSV) === 0) {
            fputcsv($fh, ['Date', 'Name', 'Email', 'Phone', 'Services', 'Videos per month', 'Message', 'Page']);
        }
        $safe = function ($v) { return preg_match('/^[=+\-@\t]/', $v) ? "'" . $v : $v; }; // stop spreadsheet formulas
        $row = array_map($safe, [$when, $name, $email, '', $services, $volume, $message, $page]);
        $row[3] = $phone !== '' ? ' ' . preg_replace('/[^0-9+()\-. ]/', '', $phone) : '';  // keeps +1 numbers as text
        fputcsv($fh, $row);
        fflush($fh);
        flock($fh, LOCK_UN);
        $saved = true;
    }
    fclose($fh);
}

// 2) Email it to you (hit Reply to answer the client directly)
$subject = 'New project inquiry: ' . $name;
if (function_exists('mb_encode_mimeheader')) $subject = mb_encode_mimeheader($subject, 'UTF-8');

$body  = "New project inquiry from barkflair.com\n";
$body .= "----------------------------------------\n\n";
$body .= "Name:              $name\n";
$body .= "Email:             $email\n";
$body .= "Phone / WhatsApp:  " . ($phone !== '' ? $phone : '-') . "\n";
$body .= "Services:          " . ($services !== '' ? $services : '-') . "\n";
$body .= "Videos per month:  " . ($volume !== '' ? $volume : '-') . "\n\n";
$body .= "Message:\n" . ($message !== '' ? $message : '-') . "\n\n";
$body .= "----------------------------------------\n";
$body .= "Sent: $when\nPage: $page\n";

$headers  = "From: BarkFlair Website <$SEND_FROM>\r\n";
$headers .= "Reply-To: " . str_replace(['<', '>', '"'], '', $name) . " <$email>\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "X-Mailer: BarkFlair-Form\r\n";

$mailed = @mail($SEND_TO, $subject, $body, $headers, '-f' . $SEND_FROM);
if (!$mailed) $mailed = @mail($SEND_TO, $subject, $body, $headers);

if ($saved || $mailed) {
    echo json_encode(['ok' => true]);
} else {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Could not send. Please email us instead.']);
}
