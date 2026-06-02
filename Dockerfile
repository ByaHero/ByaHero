# Use the official production-ready PHP image with Apache
FROM php:8.2-apache

# Install system dependencies and PHP extensions
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    zip \
    unzip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install gd mysqli pdo pdo_mysql

# Enable Apache modules required for .htaccess, ensuring only the prefork MPM is enabled
RUN rm -f /etc/apache2/mods-enabled/mpm_event.load /etc/apache2/mods-enabled/mpm_event.conf /etc/apache2/mods-enabled/mpm_worker.load /etc/apache2/mods-enabled/mpm_worker.conf
RUN a2dismod mpm_event mpm_worker || true
RUN a2enmod mpm_prefork rewrite headers expires deflate



# Set the recommended PHP configuration (Production mode)
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

# Configure Apache to listen on Google Cloud Run's dynamic $PORT (defaults to 8080)
RUN sed -i 's/Listen 80/Listen ${PORT}/g' /etc/apache2/ports.conf
RUN sed -i 's/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/g' /etc/apache2/sites-available/000-default.conf

# Copy application files to the container
COPY . /var/www/html/

# Set correct ownership for application files
RUN chown -R www-data:www-data /var/www/html

# Expose the default Cloud Run port
ENV PORT=8080
EXPOSE 8080

# Start Apache, ensuring conflicting MPM files are physically deleted at runtime
CMD ["sh", "-c", "rm -f /etc/apache2/mods-enabled/mpm_event.load /etc/apache2/mods-enabled/mpm_event.conf /etc/apache2/mods-enabled/mpm_worker.load /etc/apache2/mods-enabled/mpm_worker.conf && apache2-foreground"]

