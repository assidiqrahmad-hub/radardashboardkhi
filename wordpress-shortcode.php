<?php
/**
 * Karachi Jinnah International Airport (KHI / OPKC) Radar WordPress Shortcode
 * 
 * Instructions:
 * 1. Add this snippet to your theme's functions.php file OR using a plugin like "WPCode" / "Code Snippets".
 * 2. Use the shortcode [karachi_flight_radar] anywhere in your WordPress posts, pages, or widgets.
 * 3. Optional parameters: [karachi_flight_radar height="900px" fullscreen_button="true"]
 */

function register_karachi_flight_radar_shortcode($atts) {
    $a = shortcode_atts(array(
        'height' => '850px',
        'fullscreen_button' => 'true',
        'url' => 'https://ais-pre-g5oevaiwsxiqlrhf73dwjk-800998967132.asia-northeast1.run.app'
    ), $atts);

    ob_start();
    ?>
    <div class="khi-radar-shortcode-wrap" style="width: 100%; max-width: 1440px; margin: 20px auto;">
        <div style="position: relative; width: 100%; height: <?php echo esc_attr($a['height']); ?>; border-radius: 16px; overflow: hidden; background: #090d16; box-shadow: 0 15px 35px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08);">
            <iframe 
                src="<?php echo esc_url($a['url']); ?>" 
                style="width: 100%; height: 100%; border: none; display: block;" 
                allow="geolocation; notifications; autoplay"
                loading="lazy"
                title="Karachi Airport Live Flight Radar">
            </iframe>
        </div>
        <?php if ($a['fullscreen_button'] === 'true'): ?>
            <div style="display: flex; justify-content: flex-end; padding-top: 8px;">
                <a href="<?php echo esc_url($a['url']); ?>" target="_blank" rel="noopener noreferrer" style="font-size: 12px; color: #f59e0b; text-decoration: none; font-weight: 600;">
                    Open Flight Radar Full Screen ↗
                </a>
            </div>
        <?php endif; ?>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('karachi_flight_radar', 'register_karachi_flight_radar_shortcode');
