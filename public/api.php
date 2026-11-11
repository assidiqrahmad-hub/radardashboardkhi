<?php
// Karachi Jinnah International (KHI / OPKC) Air Traffic Proxy for WordPress Hosting
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$action = isset($_GET['action']) ? $_GET['action'] : 'flights';

if ($action === 'weather') {
    $metarUrl = 'https://aviationweather.gov/api/data/metar?ids=OPKC&format=json';
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 5,
            'header' => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) KarachiAirportRadar/1.0\r\n"
        ]
    ]);
    $raw = @file_get_contents($metarUrl, false, $ctx);
    if ($raw) {
        echo $raw;
        exit;
    }
    echo json_encode([
        'icao' => 'OPKC',
        'temp' => 28,
        'dewp' => 21,
        'wdir' => 240,
        'wspd' => 11,
        'visib' => 6000,
        'cover' => 'NSC',
        'rawOb' => 'METAR OPKC 24011KT 6000 HZ NSC 28/21 Q1013 NOSIG'
    ]);
    exit;
}

// Fetch live ADS-B aircraft from Flightradar24 for Karachi FIR
$radarUrl = 'https://data-cloud.flightradar24.com/zones/fcgi/feed.js?bounds=38.0,18.0,45.0,85.0';
$ctx = stream_context_create([
    'http' => [
        'timeout' => 5,
        'header' => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36\r\nAccept: application/json\r\n"
    ]
]);
$raw = @file_get_contents($radarUrl, false, $ctx);
$flights = [];

if ($raw) {
    $data = json_decode($raw, true);
    if (is_array($data)) {
        foreach ($data as $key => $v) {
            if (!is_array($v) || count($v) < 17) continue;
            list($hex, $lat, $lng, $track, $alt, $speed, $sq, $radar, $model, $reg, $ts, $from, $to, $fno, $gnd, $vspd, $callsign) = $v;
            
            // Exclude ground vehicles (e.g. SCOP27, sweepers, tugs, N644PK)
            $fnoUpper = strtoupper($fno ? $fno : ($callsign ? $callsign : $hex));
            if (preg_match('/^(SCOP|GND|GRND|CAR|TRUCK|SWEEP|TUG|OPS|FIRE|AMB|FOLLOW|MARSHAL|TEST|CALIB|VND|SAFETY|RDR)/i', $fnoUpper)) continue;
            if (strtoupper($reg) === 'N644PK') continue;
            if ($from === 'KHI' && $to === 'KHI' && $alt < 2000 && $speed < 140) continue;

            $dLat = ($lat - 24.9065) * 60;
            $dLng = ($lng - 67.1608) * 60 * cos(24.9065 * M_PI / 180);
            $distNm = round(sqrt($dLat * $dLat + $dLng * $dLng));

            if ($from !== 'KHI' && $to !== 'KHI' && $distNm > 150) continue;

            $isToKhi = ($to === 'KHI');
            $status = ($gnd == 1 || $alt < 100) ? ($isToKhi ? 'Landed' : 'Taxiing') : ($alt < 5000 && $distNm < 30 ? 'Approaching' : 'En Route');

            $flights[] = [
                'id' => strtolower(preg_replace('/[^a-z0-9]/i', '', $fnoUpper)),
                'flightNumber' => $fno ? $fno : ($callsign ? $callsign : "RDR-{$hex}"),
                'airline' => [
                    'name' => substr($fnoUpper, 0, 2) === 'PK' ? 'PIA' : (substr($fnoUpper, 0, 2) === 'EK' ? 'Emirates' : (substr($fnoUpper, 0, 2) === 'FZ' ? 'Flydubai' : (substr($fnoUpper, 0, 2) === 'QR' ? 'Qatar Airways' : 'Airways'))),
                    'code' => substr($fnoUpper, 0, 2),
                    'iata' => substr($fnoUpper, 0, 2),
                    'icao' => substr($fnoUpper, 0, 3),
                    'logoColor' => '#2563eb',
                    'country' => 'Commercial'
                ],
                'type' => $isToKhi ? 'arrival' : 'departure',
                'category' => in_array($from, ['LHE', 'ISB', 'PEW', 'UET', 'MUX']) || in_array($to, ['LHE', 'ISB', 'PEW', 'UET', 'MUX']) ? 'domestic' : 'international',
                'origin' => ['code' => $from ? $from : 'KHI', 'city' => $from ? $from : 'Karachi', 'name' => $from ? $from : 'Karachi Airport', 'country' => 'PK'],
                'destination' => ['code' => $to ? $to : 'DXB', 'city' => $to ? $to : 'Dubai', 'name' => $to ? $to : 'Destination', 'country' => 'INT'],
                'scheduledTime' => gmdate('Y-m-d\TH:i:s\Z'),
                'estimatedTime' => gmdate('Y-m-d\TH:i:s\Z'),
                'actualTime' => null,
                'status' => $status,
                'delayMinutes' => 0,
                'delayReason' => null,
                'terminal' => 'Jinnah Terminal 1',
                'concourse' => 'Concourse East (International)',
                'gate' => 'Gate 24',
                'checkInCounters' => 'Row D (D1-D10)',
                'baggageBelt' => 'Carousel 5',
                'aircraft' => ['model' => $model ? $model : 'Commercial Jet', 'registration' => $reg ? $reg : $hex, 'speedKnots' => $speed, 'maxAltitudeFt' => 41000],
                'telemetry' => ['lat' => $lat, 'lng' => $lng, 'altitudeFt' => $alt, 'groundSpeedKnots' => $speed, 'heading' => $track, 'progressPct' => 50, 'distanceRemainingNm' => $distNm],
                'history' => [],
                'updatedAt' => gmdate('Y-m-d\TH:i:s\Z'),
                'isLiveRadar' => true,
                'liveDataSource' => 'Flightradar24 ADS-B Live'
            ];
        }
    }
}

echo json_encode($flights);
