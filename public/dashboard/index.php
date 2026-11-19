<?php
/* BarkFlair CRM dashboard — barkflair.com/dashboard/
   Shows WhatsApp / email / phone clicks and every lead, lets you track each lead's status and notes,
   and add leads that came from Instagram, WhatsApp or Upwork by hand.
   PRIVATE: it only works once this folder is password-protected in cPanel (Directory Privacy). */
@date_default_timezone_set('Asia/Karachi');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');

$HOME   = dirname(__DIR__, 2);                 // one level above public_html (not reachable from the web)
$LEADS  = $HOME . '/barkflair-leads.csv';      // written by /contact.php
$CLICKS = $HOME . '/barkflair-clicks.csv';     // written by /track.php
$CRM    = $HOME . '/barkflair-crm.json';       // statuses, notes and hand-added leads

function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

// ---------- safety: refuse to show anything until the folder is password-protected ----------
$ht = @file_get_contents(__DIR__ . '/.htaccess');
$protected = $ht && stripos($ht, 'AuthType') !== false && stripos($ht, 'require valid-user') !== false;
if (!$protected) {
    http_response_code(403);
    ?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Protect your dashboard</title>
    <style>body{font-family:-apple-system,system-ui,sans-serif;background:#0a0d00;color:#eee;padding:28px;max-width:560px;margin:auto;line-height:1.5}b{color:#aeff00}ol{padding-left:20px}li{margin:8px 0}</style></head><body>
    <h1>Lock this page first</h1>
    <p>Your dashboard shows client names, emails and phone numbers, so it stays switched off until the folder has a password.</p>
    <ol><li>Open cPanel → <b>Directory Privacy</b>.</li><li>Go into <b>public_html</b> and click <b>Edit</b> next to the <b>dashboard</b> folder.</li><li>Tick <b>Password protect this directory</b>, type a name like <b>BarkFlair CRM</b> and click <b>Save</b>.</li><li>Under <b>Create User</b>, choose a username and a strong password, then click <b>Save</b>.</li><li>Reload this page and log in.</li></ol>
    </body></html><?php
    exit;
}

// ---------- data ----------
function read_csv($f) {
    $rows = [];
    if (!is_readable($f)) return $rows;
    if (($fh = fopen($f, 'r')) === false) return $rows;
    $head = fgetcsv($fh);
    while (($r = fgetcsv($fh)) !== false) {
        if (!$head || count($r) < 2) continue;
        $rows[] = array_combine(array_slice($head, 0, count($r)), array_slice($r, 0, count($head))) ?: [];
    }
    fclose($fh);
    return $rows;
}
function load_crm($f) { $d = is_readable($f) ? json_decode(file_get_contents($f), true) : null; return is_array($d) ? $d + ['status' => [], 'manual' => []] : ['status' => [], 'manual' => []]; }
function save_crm($f, $d) { $tmp = $f . '.tmp'; file_put_contents($tmp, json_encode($d, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX); rename($tmp, $f); }

$STATUSES = ['New', 'Contacted', 'Call booked', 'Proposal sent', 'Won', 'Lost'];
$SOURCES  = ['Website form', 'WhatsApp', 'Instagram DM', 'Facebook', 'Upwork', 'Email', 'Referral', 'Other'];
$crm = load_crm($CRM);

// ---------- saving (same-site POSTs only) ----------
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $ref = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
    if (parse_url($ref, PHP_URL_HOST) !== preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? '')) { http_response_code(403); exit('Bad request'); }
    $act = $_POST['act'] ?? '';
    $clip = function ($k, $n = 1000) { return mb_substr(trim(str_replace("\0", '', (string)($_POST[$k] ?? ''))), 0, $n); };
    if ($act === 'update') {
        $id = preg_replace('/[^a-z0-9]/', '', $_POST['id'] ?? '');
        $st = in_array($_POST['status'] ?? '', $STATUSES, true) ? $_POST['status'] : 'New';
        if ($id !== '') $crm['status'][$id] = ['status' => $st, 'notes' => $clip('notes', 3000), 'value' => $clip('value', 20), 'updated' => date('Y-m-d H:i')];
    } elseif ($act === 'add') {
        $id = 'm' . substr(sha1(uniqid('', true)), 0, 12);
        $crm['manual'][$id] = ['Date' => date('Y-m-d H:i'), 'Name' => $clip('name', 120), 'Email' => $clip('email', 160), 'Phone' => $clip('phone', 40),
            'Business' => $clip('business', 160), 'Source' => in_array($_POST['source'] ?? '', $SOURCES, true) ? $_POST['source'] : 'Other', 'Message' => $clip('message', 2000)];
        $crm['status'][$id] = ['status' => 'New', 'notes' => '', 'value' => '', 'updated' => date('Y-m-d H:i')];
    } elseif ($act === 'delete') {
        $id = preg_replace('/[^a-z0-9]/', '', $_POST['id'] ?? '');
        unset($crm['manual'][$id]);
    }
    save_crm($CRM, $crm);
    header('Location: ./' . (isset($_POST['tab']) ? '?tab=' . urlencode($_POST['tab']) : '') . (isset($id) ? '#l' . $id : ''));
    exit;
}

if (($_GET['download'] ?? '') === 'leads' && is_readable($LEADS)) {
    header('Content-Type: text/csv'); header('Content-Disposition: attachment; filename="barkflair-leads.csv"'); readfile($LEADS); exit;
}

// ---------- build lead list ----------
$leads = [];
foreach (read_csv($LEADS) as $r) {
    $id = 'f' . substr(sha1(($r['Date'] ?? '') . '|' . ($r['Email'] ?? '') . '|' . ($r['Name'] ?? '')), 0, 12);
    $leads[$id] = $r + ['Source' => 'Website form', 'Business' => ''];
}
foreach ($crm['manual'] as $id => $r) $leads[$id] = $r;
uasort($leads, function ($a, $b) { return strcmp($b['Date'] ?? '', $a['Date'] ?? ''); });

$clicks = read_csv($CLICKS);
$now = time();
function within($d, $days, $now) { $t = strtotime($d); return $t && $t >= $now - $days * 86400; }
$count = function ($type, $days) use ($clicks, $now) { $n = 0; foreach ($clicks as $c) if (($c['Type'] ?? '') === $type && within($c['Date'] ?? '', $days, $now)) $n++; return $n; };
$today = function ($type) use ($clicks) { $n = 0; $d = date('Y-m-d'); foreach ($clicks as $c) if (($c['Type'] ?? '') === $type && strpos($c['Date'] ?? '', $d) === 0) $n++; return $n; };
$leadCount = function ($days) use ($leads, $now) { $n = 0; foreach ($leads as $l) if (within($l['Date'] ?? '', $days, $now)) $n++; return $n; };
$group = function ($field, $days = 30, $type = 'whatsapp') use ($clicks, $now) { $g = []; foreach ($clicks as $c) if (($c['Type'] ?? '') === $type && within($c['Date'] ?? '', $days, $now)) { $k = $c[$field] ?? '?'; $g[$k] = ($g[$k] ?? 0) + 1; } arsort($g); return $g; };

$days14 = []; for ($i = 13; $i >= 0; $i--) { $days14[date('Y-m-d', $now - $i * 86400)] = 0; }
foreach ($clicks as $c) { $d = substr($c['Date'] ?? '', 0, 10); if (($c['Type'] ?? '') === 'whatsapp' && isset($days14[$d])) $days14[$d]++; }
$max14 = max(1, max($days14));

$pipeline = array_fill_keys($STATUSES, 0);
foreach ($leads as $id => $l) { $s = $crm['status'][$id]['status'] ?? 'New'; $pipeline[$s] = ($pipeline[$s] ?? 0) + 1; }
$won = 0; foreach ($leads as $id => $l) if (($crm['status'][$id]['status'] ?? '') === 'Won') $won += (float)preg_replace('/[^0-9.]/', '', $crm['status'][$id]['value'] ?? '0');

$tab = in_array($_GET['tab'] ?? '', ['leads', 'clicks', 'add'], true) ? $_GET['tab'] : 'leads';
$filter = $_GET['status'] ?? '';
?><!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#000">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="BarkFlair CRM">
<title>BarkFlair CRM</title>
<style>
:root{--bg:#050700;--card:#0f1305;--line:#262d14;--fg:#f2f4ea;--mut:#9aa38a;--lime:#aeff00;--ink:#0a0d00}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.45 -apple-system,system-ui,Segoe UI,Roboto,sans-serif;padding:0 14px 60px;padding-top:env(safe-area-inset-top)}
a{color:var(--lime)}header{display:flex;align-items:center;justify-content:space-between;padding:16px 0 10px}header img{height:30px}
.tabs{display:flex;gap:6px;position:sticky;top:0;background:var(--bg);padding:8px 0;z-index:5}.tabs a{flex:1;text-align:center;padding:10px 6px;border:1px solid var(--line);border-radius:12px;color:var(--fg);text-decoration:none;font-weight:600;font-size:14px}.tabs a.on{background:var(--lime);color:var(--ink);border-color:var(--lime)}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:12px 0}@media(min-width:760px){.grid{grid-template-columns:repeat(4,1fr)}body{max-width:1000px;margin:auto}}
.k{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px}.k b{display:block;font-size:26px;color:var(--lime);line-height:1.1}.k span{color:var(--mut);font-size:12.5px}
h2{font-size:17px;margin:22px 0 10px}.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:10px}
.row{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--line);font-size:14px}.row:last-child{border:0}.row span:last-child{color:var(--lime);font-weight:700}
.bars{display:flex;align-items:flex-end;gap:4px;height:90px}.bars div{flex:1;background:var(--lime);border-radius:4px 4px 0 0;min-height:2px;position:relative}.bars small{display:flex;justify-content:space-between;color:var(--mut);font-size:11px;margin-top:6px}
.lead h3{margin:0 0 2px;font-size:16px}.meta{color:var(--mut);font-size:12.5px}.pill{display:inline-block;padding:2px 9px;border-radius:99px;font-size:12px;font-weight:700;background:#1d2410;color:var(--lime);margin-left:6px}
.pill.Won{background:var(--lime);color:var(--ink)}.pill.Lost{background:#2a1414;color:#ff8f8f}
.acts{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.acts a{padding:7px 12px;border:1px solid var(--line);border-radius:10px;text-decoration:none;font-size:13.5px;color:var(--fg)}
.msg{white-space:pre-wrap;background:#0a0d03;border-radius:10px;padding:10px;margin:8px 0;font-size:14px}
input,select,textarea{width:100%;background:#0a0d03;color:var(--fg);border:1px solid var(--line);border-radius:10px;padding:10px;font:inherit;margin:4px 0 10px}textarea{min-height:70px}
button{background:var(--lime);color:var(--ink);border:0;border-radius:10px;padding:11px 16px;font-weight:800;font:inherit;font-weight:800;width:100%}
.f2{display:grid;grid-template-columns:1fr 1fr;gap:8px}.chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px}.chips a{white-space:nowrap;padding:6px 11px;border:1px solid var(--line);border-radius:99px;text-decoration:none;color:var(--fg);font-size:13px}.chips a.on{border-color:var(--lime);color:var(--lime)}
details summary{cursor:pointer;color:var(--lime);font-weight:600;font-size:14px}.empty{color:var(--mut);text-align:center;padding:30px 10px}
.del{background:none;color:#ff8f8f;border:1px solid #3a1a1a;margin-top:6px}
</style></head><body>
<header><img src="/assets/logo.svg" alt="BarkFlair"><span class="meta"><?= h(date('D j M, g:i A')) ?> PKT</span></header>
<nav class="tabs"><a href="?tab=leads" class="<?= $tab === 'leads' ? 'on' : '' ?>">Leads</a><a href="?tab=clicks" class="<?= $tab === 'clicks' ? 'on' : '' ?>">Clicks</a><a href="?tab=add" class="<?= $tab === 'add' ? 'on' : '' ?>">+ Add lead</a></nav>

<div class="grid">
  <div class="k"><b><?= $today('whatsapp') ?></b><span>WhatsApp clicks today</span></div>
  <div class="k"><b><?= $count('whatsapp', 7) ?></b><span>WhatsApp clicks, 7 days</span></div>
  <div class="k"><b><?= $leadCount(30) ?></b><span>Leads, 30 days</span></div>
  <div class="k"><b><?= $pipeline['Won'] ?><?= $won ? ' · $' . h(number_format($won)) : '' ?></b><span>Won clients</span></div>
</div>

<?php if ($tab === 'leads'): ?>
  <div class="chips"><a href="?tab=leads" class="<?= $filter === '' ? 'on' : '' ?>">All (<?= count($leads) ?>)</a>
  <?php foreach ($pipeline as $s => $n): ?><a href="?tab=leads&status=<?= urlencode($s) ?>" class="<?= $filter === $s ? 'on' : '' ?>"><?= h($s) ?> (<?= $n ?>)</a><?php endforeach; ?></div>
  <?php $shown = 0; foreach ($leads as $id => $l): $st = $crm['status'][$id] ?? ['status' => 'New', 'notes' => '', 'value' => '']; if ($filter && $st['status'] !== $filter) continue; $shown++;
    $phone = trim($l['Phone'] ?? ''); $wa = preg_replace('/[^0-9]/', '', $phone); ?>
  <div class="card lead" id="l<?= h($id) ?>">
    <h3><?= h($l['Name'] ?: 'No name') ?><span class="pill <?= h(str_replace(' ', '', $st['status'])) ?>"><?= h($st['status']) ?></span></h3>
    <div class="meta"><?= h($l['Date'] ?? '') ?> · <?= h($l['Source'] ?? 'Website form') ?><?= !empty($l['Page']) ? ' · from ' . h($l['Page']) : '' ?><?= !empty($l['Business']) ? ' · ' . h($l['Business']) : '' ?></div>
    <div class="acts">
      <?php if (!empty($l['Email'])): ?><a href="mailto:<?= h($l['Email']) ?>">✉️ <?= h($l['Email']) ?></a><?php endif; ?>
      <?php if ($wa): ?><a href="https://wa.me/<?= h($wa) ?>" target="_blank" rel="noopener">WhatsApp</a><a href="tel:<?= h($phone) ?>">📞 <?= h($phone) ?></a><?php endif; ?>
    </div>
    <?php if (!empty($l['Services']) || !empty($l['Videos per month'])): ?><div class="meta">Wants: <?= h($l['Services'] ?? '') ?><?= !empty($l['Videos per month']) ? ' · ' . h($l['Videos per month']) . ' videos/month' : '' ?></div><?php endif; ?>
    <?php if (!empty($l['Message'])): ?><div class="msg"><?= h($l['Message']) ?></div><?php endif; ?>
    <details><summary>Update status &amp; notes</summary>
      <form method="post"><input type="hidden" name="act" value="update"><input type="hidden" name="id" value="<?= h($id) ?>"><input type="hidden" name="tab" value="leads">
        <div class="f2"><div><label class="meta">Status</label><select name="status"><?php foreach ($STATUSES as $s): ?><option<?= $s === $st['status'] ? ' selected' : '' ?>><?= h($s) ?></option><?php endforeach; ?></select></div>
        <div><label class="meta">Deal value ($)</label><input name="value" inputmode="decimal" value="<?= h($st['value'] ?? '') ?>" placeholder="250"></div></div>
        <label class="meta">Notes</label><textarea name="notes" placeholder="Called on WhatsApp, wants the $250 ad pack…"><?= h($st['notes'] ?? '') ?></textarea>
        <button>Save</button></form>
      <?php if ($id[0] === 'm'): ?><form method="post" onsubmit="return confirm('Delete this lead?')"><input type="hidden" name="act" value="delete"><input type="hidden" name="id" value="<?= h($id) ?>"><button class="del">Delete lead</button></form><?php endif; ?>
    </details>
    <?php if (!empty($st['notes'])): ?><div class="meta" style="margin-top:8px">📝 <?= h($st['notes']) ?></div><?php endif; ?>
  </div>
  <?php endforeach; if (!$shown): ?><div class="empty">No leads here yet. Website form leads appear automatically. Add Instagram, WhatsApp or Upwork leads with “+ Add lead”.</div><?php endif; ?>
  <?php if (is_readable($LEADS)): ?><p class="meta" style="text-align:center"><a href="?download=leads">Download website leads (CSV)</a></p><?php endif; ?>

<?php elseif ($tab === 'clicks'): ?>
  <h2>WhatsApp clicks, last 14 days</h2>
  <div class="card"><div class="bars"><?php foreach ($days14 as $d => $n): ?><div style="height:<?= round($n / $max14 * 100) ?>%" title="<?= h($d) ?>: <?= $n ?>"></div><?php endforeach; ?></div>
  <small style="display:flex;justify-content:space-between;color:var(--mut);font-size:11px;margin-top:6px"><span><?= h(date('j M', strtotime(array_key_first($days14)))) ?></span><span>Today</span></small></div>
  <div class="grid">
    <div class="k"><b><?= $count('whatsapp', 30) ?></b><span>WhatsApp, 30 days</span></div>
    <div class="k"><b><?= $count('email', 30) ?></b><span>Email clicks, 30 days</span></div>
    <div class="k"><b><?= $count('upwork', 30) ?></b><span>Upwork link clicks</span></div>
    <div class="k"><b><?= $count('instagram', 30) + $count('facebook', 30) ?></b><span>Instagram + Facebook clicks</span></div>
  </div>
  <h2>Which page they clicked WhatsApp from</h2>
  <div class="card"><?php $g = $group('Page'); if (!$g) echo '<div class="empty">No clicks yet.</div>'; foreach (array_slice($g, 0, 12, true) as $k => $n): ?><div class="row"><span><?= h($k) ?></span><span><?= $n ?></span></div><?php endforeach; ?></div>
  <h2>Where those visitors came from</h2>
  <div class="card"><?php $g = $group('Source'); if (!$g) echo '<div class="empty">No clicks yet.</div>'; foreach ($g as $k => $n): ?><div class="row"><span><?= h(ucfirst($k)) ?></span><span><?= $n ?></span></div><?php endforeach; ?></div>
  <h2>Device</h2>
  <div class="card"><?php foreach ($group('Device') as $k => $n): ?><div class="row"><span><?= h(ucfirst($k)) ?></span><span><?= $n ?></span></div><?php endforeach; ?></div>
  <p class="meta">A click means someone tapped the button. Their actual message and number show up in WhatsApp itself.</p>

<?php else: ?>
  <h2>Add a lead</h2>
  <form method="post" class="card"><input type="hidden" name="act" value="add"><input type="hidden" name="tab" value="leads">
    <label class="meta">Name</label><input name="name" required placeholder="Daniel">
    <label class="meta">Business</label><input name="business" placeholder="D&amp;D Orlando Car Detailing">
    <div class="f2"><div><label class="meta">Phone / WhatsApp</label><input name="phone" inputmode="tel" placeholder="+1 407…"></div><div><label class="meta">Email</label><input name="email" type="email"></div></div>
    <label class="meta">Where they came from</label><select name="source"><?php foreach ($SOURCES as $s): ?><option><?= h($s) ?></option><?php endforeach; ?></select>
    <label class="meta">What they need</label><textarea name="message" placeholder="$250 ad test pack, 3 hooks…"></textarea>
    <button>Add lead</button></form>
<?php endif; ?>
</body></html>
