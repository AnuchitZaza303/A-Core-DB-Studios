<?php
/**
 * A-Core Database Studio - Root Delegator
 * Seamlessly delegates requests to public/index.php
 */

declare(strict_types=1);

// Forward to public front controller
require_once __DIR__ . '/public/index.php';
