<?php
declare(strict_types=1);

// Explicit production preparation entry point. The shared importer still refuses
// to overwrite a populated schema, and never writes to the MySQL source.
define('BYAHERO_PRODUCTION_IMPORT', true);
require __DIR__.'/migrate-database.php';
