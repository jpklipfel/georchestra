Install notes for a fresh Debian stable, based on a unique tomcat instance.

LDAP
=====

* install the required packages

        sudo apt-get install slapd ldap-utils

* sample data import

 * getting the data
 
            sudo apt-get install git-core
            git clone git://github.com/georchestra/LDAP.git
            cd LDAP
	
 * inserting the data: follow the instructions in https://github.com/georchestra/LDAP/blob/master/README.md

 * check everything is OK:
 
            ldapsearch -x -bdc=georchestra,dc=org | less

PostGreSQL
==========

* Installation:

        sudo apt-get install postgresql postgresql-9.1-postgis postgis


* "georchestra" database hosting schemas specific to deployed modules:

        createdb georchestra
        createuser -SDRIP www-data (the default setup expects that the www-data user password is www-data)
        psql -d georchestra -c 'GRANT ALL PRIVILEGES ON DATABASE georchestra TO "www-data";'

Note 1: It is of course possible to store webapp-specific schemas in separate databases, taking advantage of geOrchestra's extreme configurability.

Note 2: PostGIS extensions are not required in the georchestra database, unless GeoFence is deployed (see below), or ```shared.psql.jdbc.driver=org.postgis.DriverWrapper``` in your configuration (but this is not the default setup).


 * if **geonetwork** is to be deployed, you need to create a dedicated user and schema:

        createuser -SDRIP geonetwork (the default setup expects that the geonetwork user password is www-data)
        psql -d georchestra -c 'CREATE SCHEMA geonetwork;'
        psql -d georchestra -c 'GRANT ALL PRIVILEGES ON SCHEMA geonetwork TO "geonetwork";'

 * if **mapfishapp** is deployed:

        wget https://raw.github.com/georchestra/georchestra/master/mapfishapp/database.sql -O /tmp/mapfishapp.sql
        psql -d georchestra -f /tmp/mapfishapp.sql
        psql -d georchestra -c 'GRANT ALL PRIVILEGES ON SCHEMA mapfishapp TO "www-data";'
        psql -d georchestra -c 'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA mapfishapp TO "www-data";'
        psql -d georchestra -c 'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA mapfishapp TO "www-data";'

 * if the **ldapadmin** webapp is deployed:

        wget https://raw.github.com/georchestra/georchestra/master/ldapadmin/database.sql -O /tmp/ldapadmin.sql
        psql -d georchestra -f /tmp/ldapadmin.sql
        psql -d georchestra -c 'GRANT ALL PRIVILEGES ON SCHEMA ldapadmin TO "www-data";'
        psql -d georchestra -c 'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ldapadmin TO "www-data";'
        psql -d georchestra -c 'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ldapadmin TO "www-data";'

 * if **geofence** is deployed:

        createlang plpgsql georchestra
        psql -f /usr/share/postgresql/9.1/contrib/postgis-1.5/postgis.sql georchestra
        psql -f /usr/share/postgresql/9.1/contrib/postgis-1.5/spatial_ref_sys.sql georchestra
        psql -d georchestra -c 'GRANT SELECT ON public.spatial_ref_sys to "www-data";'
        psql -d georchestra -c 'GRANT SELECT,INSERT,DELETE ON public.geometry_columns to "www-data";'
        wget https://raw.github.com/georchestra/geofence/georchestra/doc/setup/sql/002_create_schema_postgres.sql -O /tmp/geofence.sql
        psql -d georchestra -f /tmp/geofence.sql
        psql -d georchestra -c 'GRANT ALL PRIVILEGES ON SCHEMA geofence TO "www-data";'
        psql -d georchestra -c 'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA geofence TO "www-data";'
        psql -d georchestra -c 'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA geofence TO "www-data";'

 * if the **downloadform** module is deployed and ```shared.download_form.activated``` is true in your setup (false by default):

        wget https://raw.github.com/georchestra/georchestra/master/downloadform/database.sql -O /tmp/downloadform.sql
        psql -d georchestra -f /tmp/downloadform.sql
        psql -d georchestra -c 'GRANT ALL PRIVILEGES ON SCHEMA downloadform TO "www-data";'
        psql -d georchestra -c 'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA downloadform TO "www-data";'
        psql -d georchestra -c 'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA downloadform TO "www-data";'
        
 * if the **security proxy** is deployed and ```shared.ogc.statistics.activated``` is true in your setup (false by default):

        wget https://raw.github.com/georchestra/georchestra/master/ogc-server-statistics/database.sql -O /tmp/ogcstatistics.sql
        psql -d georchestra -f /tmp/ogcstatistics.sql
        psql -d georchestra -c 'GRANT ALL PRIVILEGES ON SCHEMA ogcstatistics TO "www-data";'
        psql -d georchestra -c 'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ogcstatistics TO "www-data";'
        psql -d georchestra -c 'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ogcstatistics TO "www-data";'


Apache
=========

* modules setup

        sudo apt-get install apache2
        sudo a2enmod proxy_ajp proxy_connect proxy_http proxy ssl rewrite headers
        sudo service apache2 graceful

* VirtualHost setup

        cd /etc/apache2/sites-available
        sudo a2dissite default default-ssl
        sudo nano georchestra

    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   	<VirtualHost *:80>
		 ServerName vm-georchestra
		 DocumentRoot /var/www/georchestra/htdocs
		 LogLevel warn
		 ErrorLog /var/www/georchestra/logs/error.log
		 CustomLog /var/www/georchestra/logs/access.log "combined"
		 Include /var/www/georchestra/conf/*.conf
		 ServerSignature Off
	</VirtualHost>
	<VirtualHost *:443>
		 ServerName vm-georchestra
		 DocumentRoot /var/www/georchestra/htdocs
		 LogLevel warn
		 ErrorLog /var/www/georchestra/logs/error.log
		 CustomLog /var/www/georchestra/logs/access.log "combined"
		 Include /var/www/georchestra/conf/*.conf
		 SSLEngine On
		 SSLCertificateFile /var/www/georchestra/ssl/georchestra.crt
		 SSLCertificateKeyFile /var/www/georchestra/ssl/georchestra-unprotected.key
		 SSLCACertificateFile /etc/ssl/certs/ca-certificates.crt
		 ServerSignature Off
	</VirtualHost>
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

        sudo a2ensite georchestra
   
* web directories for geOrchestra

        cd /var/www
        sudo mkdir georchestra
        cd georchestra
        sudo mkdir conf htdocs logs ssl

    Debian apache user is www-data

        sudo id www-data

    we have to grant write on logs to www-data:

        sudo chgrp www-data logs/
        sudo chmod g+w logs/

* Error documents (useful when tomcat restarts for maintenance)

        mkdir -p /var/www/georchestra/htdocs/errors
        wget http://sdi.georchestra.org/errors/50x.html -O /var/www/georchestra/htdocs/errors/50x.html


* Apache config

        cd conf/
        sudo nano /var/www/georchestra/conf/proxypass.conf
        
    should have something like:
        
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    <IfModule !mod_proxy.c>
        LoadModule proxy_module /usr/lib/apache2/modules/mod_proxy.so
    </IfModule>
    <IfModule !mod_proxy_http.c>
        LoadModule proxy_http_module /usr/lib/apache2/modules/mod_proxy_http.so
    </IfModule>

    RewriteLog /tmp/rewrite.log
    RewriteLogLevel 3

    SetEnv no-gzip on
    ProxyTimeout 999999999
    
    AddType application/vnd.ogc.context+xml .wmc

    RewriteEngine On
    RewriteRule ^/analytics$ /analytics/ [R]
    RewriteRule ^/cas$ /cas/ [R]
    RewriteRule ^/catalogapp$ /catalogapp/ [R]
    RewriteRule ^/downloadform$ /downloadform/ [R]
    RewriteRule ^/extractorapp$ /extractorapp/ [R]
    RewriteRule ^/extractorapp/admin$ /extractorapp/admin/ [R]
    RewriteRule ^/geonetwork$ /geonetwork/ [R]
    RewriteRule ^/geoserver$ /geoserver/ [R]
    RewriteRule ^/geofence$ /geofence/ [R]
    RewriteRule ^/geowebcache$ /geowebcache/ [R]
    RewriteRule ^/header$ /header/ [R]
    RewriteRule ^/ldapadmin$ /ldapadmin/ [R]
    RewriteRule ^/ldapadmin/privateui$ /ldapadmin/privateui/ [R]
    RewriteRule ^/mapfishapp$ /mapfishapp/ [R]
    RewriteRule ^/proxy$ /proxy/ [R]
    
    ErrorDocument 502 /errors/50x.html
    ErrorDocument 503 /errors/50x.html

    ProxyPass /casfailed.jsp ajp://localhost:8009/casfailed.jsp 
    ProxyPassReverse /casfailed.jsp ajp://localhost:8009/casfailed.jsp

    ProxyPass /j_spring_cas_security_check ajp://localhost:8009/j_spring_cas_security_check 
    ProxyPassReverse /j_spring_cas_security_check ajp://localhost:8009/j_spring_cas_security_check

    ProxyPass /j_spring_security_logout ajp://localhost:8009/j_spring_security_logout 
    ProxyPassReverse /j_spring_security_logout ajp://localhost:8009/j_spring_security_logout

    <Proxy ajp://localhost:8009/analytics/*>
        Order deny,allow
        Allow from all
    </Proxy>
    ProxyPass /analytics/ ajp://localhost:8009/analytics/ 
    ProxyPassReverse /analytics/ ajp://localhost:8009/analytics/

    <Proxy ajp://localhost:8009/cas/*>
        Order deny,allow
        Allow from all
    </Proxy>
    ProxyPass /cas/ ajp://localhost:8009/cas/ 
    ProxyPassReverse /cas/ ajp://localhost:8009/cas/

    <Proxy ajp://localhost:8009/catalogapp/*>
        Order deny,allow
        Allow from all
    </Proxy>
    ProxyPass /catalogapp/ ajp://localhost:8009/catalogapp/ 
    ProxyPassReverse /catalogapp/ ajp://localhost:8009/catalogapp/

    <Proxy ajp://localhost:8009/downloadform/*>
        Order deny,allow
        Allow from all
    </Proxy>
    ProxyPass /downloadform/ ajp://localhost:8009/downloadform/ 
    ProxyPassReverse /downloadform/ ajp://localhost:8009/downloadform/

    <Proxy ajp://localhost:8009/extractorapp/*>
        Order deny,allow
        Allow from all
    </Proxy>
    ProxyPass /extractorapp/ ajp://localhost:8009/extractorapp/ 
    ProxyPassReverse /extractorapp/ ajp://localhost:8009/extractorapp/

    <Proxy ajp://localhost:8009/geonetwork/*>
        Order deny,allow
        Allow from all
    </Proxy>
    ProxyPass /geonetwork/ ajp://localhost:8009/geonetwork/ 
    ProxyPassReverse /geonetwork/ ajp://localhost:8009/geonetwork/

    <Proxy ajp://localhost:8009/geonetwork-private/*>
        Order deny,allow
        Allow from all
    </Proxy>
    ProxyPass /geonetwork-private/ ajp://localhost:8009/geonetwork-private/ 
    ProxyPassReverse /geonetwork-private/ ajp://localhost:8009/geonetwork-private/

    <Proxy ajp://localhost:8009/geoserver/*>
        Order deny,allow
        Allow from all
    </Proxy>
    ProxyPass /geoserver/ ajp://localhost:8009/geoserver/ 
    ProxyPassReverse /geoserver/ ajp://localhost:8009/geoserver/

    <Proxy ajp://localhost:8009/geofence/*>
        Order deny,allow
        Allow from all
    </Proxy>
    ProxyPass /geofence/ ajp://localhost:8009/geofence/ 
    ProxyPassReverse /geofence/ ajp://localhost:8009/geofence/

    ProxyPass /geowebcache/ ajp://localhost:8009/geowebcache/ 
    ProxyPassReverse /geowebcache/ ajp://localhost:8009/geowebcache/

    <Proxy ajp://localhost:8009/ldapadmin/*>
        Order deny,allow
        Allow from all
    </Proxy>
    ProxyPass /ldapadmin/ ajp://localhost:8009/ldapadmin/
    ProxyPassReverse /ldapadmin/ ajp://localhost:8009/ldapadmin/

    <Proxy ajp://localhost:8009/mapfishapp/*>
        Order deny,allow
        Allow from all
    </Proxy>
    ProxyPass /mapfishapp/ ajp://localhost:8009/mapfishapp/ 
    ProxyPassReverse /mapfishapp/ ajp://localhost:8009/mapfishapp/

    <Proxy ajp://localhost:8009/proxy/*>
        Order deny,allow
        Allow from all
    </Proxy>
    ProxyPass /proxy/ ajp://localhost:8009/proxy/ 
    ProxyPassReverse /proxy/ ajp://localhost:8009/proxy/

    <Proxy ajp://localhost:8009/header/*>
        Order deny,allow
        Allow from all
    </Proxy>
    ProxyPass /header/ ajp://localhost:8009/header/
    ProxyPassReverse /header/ ajp://localhost:8009/header/

    <Proxy ajp://localhost:8009/_static/*>
        Order deny,allow
        Allow from all
    </Proxy>
    ProxyPass /_static/ ajp://localhost:8009/_static/
    ProxyPassReverse /_static/ ajp://localhost:8009/_static/

    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 
Apache - SSL certificate
-----------------------

* private key generation (enter a passphrase)

        cd /var/www/georchestra/ssl
        sudo openssl genrsa -des3 -out georchestra.key 1024

* certificate generated for this key

        sudo openssl req -new -key georchestra.key -out georchestra.csr

* fill the form without providing a password

        Common Name (eg, YOUR name) []: put your server name (eg: vm-georchestra)

* create an unprotected key

        sudo openssl rsa -in georchestra.key -out georchestra-unprotected.key
        sudo openssl x509 -req -days 365 -in georchestra.csr -signkey georchestra.key -out georchestra.crt

* restart apache

        sudo service apache2 graceful
        
* update your hosts

        sudo nano /etc/hosts


        127.0.0.1       vm-georchestra

* testing

  * http://vm-georchestra
  * https://vm-georchestra

Tomcat
=========

Install Tomcat from package
---------------------------

This one Tomcat instance installation is for test purpose. When running a real-world SDI, you will need to use various Tomcat instances.

    sudo apt-get install tomcat6

Remove any webapp

	sudo rm -rf /var/lib/tomcat6/webapps/*
	
Create a directory for tomcat6 java preferences (to avoid a `WARNING: Couldn't flush user prefs: java.util.prefs.BackingStoreException: Couldn't get file lock.` error)

	sudo mkdir /usr/share/tomcat6/.java
	sudo chown tomcat6:tomcat6 /usr/share/tomcat6/.java


Environment variables
----------------------

```
sudo nano /etc/default/tomcat6
```

```
JAVA_OPTS="$JAVA_OPTS \
              -Djava.awt.headless=true \
              -Xms4G \
              -Xmx8G \
              -XX:MaxPermSize=256m "
```

Some geOrchestra applications will require you to add more JAVA_OPTS, read below...

Keystore/Trustore
-------------------

* Keystore creation (change the "mdpstore" password)

        cd /etc/tomcat6/
        sudo keytool -genkey -alias georchestra_localhost -keystore keystore -storepass mdpstore -keypass mdpstore -keyalg RSA -keysize 2048

    Put "localhost" in "first name and second name" since sec-proxy and CAS are on the same tomcat

    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Quels sont vos prénom et nom ?
      [Unknown] :  localhost
    Quel est le nom de votre unité organisationnelle ?
      [Unknown] :
    Quelle est le nom de votre organisation ?
      [Unknown] :
    Quel est le nom de votre ville de résidence ?
      [Unknown] :
    Quel est le nom de votre état ou province ?
      [Unknown] :
    Quel est le code de pays ? deux lettres pour cette unit? ?
      [Unknown] :
    Est-ce CN=localhost, OU=Unknown, O=Unknown, L=Unknown, ST=Unknown, C=Unknown ?
      [non] :  oui
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    
        keytool -keystore keystore -list
       
* truststore config

```
sudo nano /etc/default/tomcat6
```

```
JAVA_OPTS="$JAVA_OPTS -Djavax.net.ssl.trustStore=/etc/tomcat6/keystore -Djavax.net.ssl.trustStorePassword=mdpstore"
```

* connectors config

```
sudo nano /etc/tomcat6/server.xml
```

```
<Connector port="8080" protocol="HTTP/1.1"
   connectionTimeout="20000"
   URIEncoding="UTF-8"
   redirectPort="8443" />
```

```
<Connector port="8443" protocol="HTTP/1.1" SSLEnabled="true"
   URIEncoding="UTF-8"
   maxThreads="150" scheme="https" secure="true"
   clientAuth="false"
   keystoreFile="/etc/tomcat6/keystore"
   keystorePass="mdpstore"
   compression="on"
   compressionMinSize="2048"
   noCompressionUserAgents="gozilla, traviata"
   compressableMimeType="text/html,text/xml,text/javascript,application/x-javascript,application/javascript,text/css" />
```

```
<Connector URIEncoding="UTF-8"
   port="8009"
   protocol="AJP/1.3"
   connectionTimeout="20000"
   redirectPort="8443" />
```
    
* Tomcat restart
 
        sudo service tomcat6 restart
    


GeoServer
=========

* Tomcat

Required JAVA_OPTS for GeoServer :

```
sudo nano /etc/default/tomcat6
```

```
JAVA_OPTS="$JAVA_OPTS
    -Xms2G -Xmx2G -XX:PermSize=256m -XX:MaxPermSize=256m \
    -DGEOSERVER_DATA_DIR=/path/to/geoserver/data/dir \
    -DGEOWEBCACHE_CACHE_DIR=/path/to/geowebcache/cache/dir \
    -Djava.awt.headless=true \
    -Dfile.encoding=UTF8 \
    -Djavax.servlet.request.encoding=UTF-8 \
    -Djavax.servlet.response.encoding=UTF-8 \
    -server \
    -XX:+UseConcMarkSweepGC -XX:+UseParNewGC -XX:ParallelGCThreads=2 \
    -XX:SoftRefLRUPolicyMSPerMB=36000 \
    -XX:NewRatio=2 \
    -XX:+AggressiveOpts "  
```

* Fonts

GeoServer uses the fonts available to the JVM for WMS styling.
You may have to install the "core fonts for the web" on your server if you need them.

	sudo apt-get install ttf-mscorefonts-installer

Restart your geoserver tomcat and check on /geoserver/web/?wicket:bookmarkablePage=:org.geoserver.web.admin.JVMFontsPage that these are loaded.

* Fine tuning (optional but highly recommended)

Please refer to the excellent "[Running in a Production Environment](http://docs.geoserver.org/stable/en/user/production/index.html)" section of the GeoServer documentation.

You may also want to setup limits to the number of concurrent requests handled by your GeoServer. By default, geOrchestra GeoServer ships with the [control flow](http://docs.geoserver.org/stable/en/user/extensions/controlflow/index.html) module installed, but not activated. To do so, you have to create a custom ```controlflow.properties``` file in your geoserver data dir. Please refer to the module documentation for the syntax.

For GeoWebCache, a collection of tips and tricks can be found here:  http://geo-solutions.blogspot.fr/2012/05/tips-tricks-geowebcache-tweaks.html

GeoNetwork
==========

Be sure to include those options in your tomcat JAVA_OPTS setup:

```
sudo nano /etc/default/tomcat6
```

```
JAVA_OPTS="$JAVA_OPTS -Dgeonetwork.dir=/path/to/geonetwork-data-dir \
    -Dgeonetwork[-private].schema.dir=/path/to/tomcat/webapps/geonetwork[-private]/WEB-INF/data/config/schema_plugins \
    -Dgeonetwork.jeeves.configuration.overrides.file=/path/to/tomcat/webapps/geonetwork[-private]/WEB-INF/config-overrides-georchestra.xml"
```

... where brackets indicate optional strings, depending on your setup.


Extractorapp
============

Again, it is required to include custom options in your tomcat JAVA_OPTS setup:

```
sudo nano /etc/default/tomcat6
```

```
JAVA_OPTS="$JAVA_OPTS -Dorg.geotools.referencing.forceXY=true \
    -Dextractor.storage.dir=/path/to/temporary/extracts/"
```

Note: if the epsg-extension module is installed, one can manage custom EPSG codes by adding:

```
sudo nano /etc/default/tomcat6
```

```
JAVA_OPTS="$JAVA_OPTS -DCUSTOM_EPSG_FILE=file://$CATALINA_BASE/conf/epsg.properties"
```

... in which a sample epsg.properties file can be found [here](server-deploy-support/src/main/resources/c2c/tomcat/conf/epsg.properties)

GDAL for GeoServer, Extractorapp & Mapfishapp
=============================================

Extractorapp **requires** GDAL and GDAL Java bindings libraries installed on the server.

GeoServer uses them to access more data formats, read http://docs.geoserver.org/latest/en/user/data/raster/gdal.html

Mapfishapp also optionally uses them for the file upload functionality, that allows to upload a vectorial data file to mapfishapp in order to display it as a layer. This functionnality in Mapfishapp relies normally on GeoTools, however, the supported file formats are limited (at 2013-10-17: shp, mif, gml and kml). If GDAL and GDAL Java bindings libraries are installed, the number of supported file formats is increased. This would give access, for example, to extra formats such as GPX and TAB.

The key element for calling the GDAL native library from mapfishapp is the **imageio-ext library** (see https://github.com/geosolutions-it/imageio-ext/wiki). It relies on:
 * jar files, that are included at build by maven,
 * a GDAL Java binding library, based on the JNI framework,
 * and obviously the GDAL library.

The latter can be installed, on Debian-based distributions, with the libgdal1 package:

    sudo apt-get install libgdal1

Some more work is needed for installing the GDAL Java binding library, as there is still no deb package for it (note that packages exist for ruby and perl bindings, hopefully the Java's one will be released soon - see a recent proposal http://ftp-master.debian.org/new/gdal_1.10.0-0%7Eexp3.html).

To quickly install the GDAL Java binding library on the server, download and extract the library and its data (see http://demo.geo-solutions.it/share/github/imageio-ext/releases/1.1.X/1.1.7/native/gdal/ for the adequate distribution). 
Example for Debian Wheezy on amd64:

    sudo mkdir -p /var/sig/gdal/NativeLibs/
    sudo wget http://demo.geo-solutions.it/share/github/imageio-ext/releases/1.1.X/1.1.7/native/gdal/linux/gdal192-Ubuntu12-gcc4.6.3-x86_64.tar.gz -O /var/sig/gdal/NativeLibs/gdal_libs.tgz
    cd /var/sig/gdal/NativeLibs/ && sudo tar xvzf gdal_libs.tgz
    
    sudo wget http://demo.geo-solutions.it/share/github/imageio-ext/releases/1.1.X/1.1.7/native/gdal/gdal-data.zip -O /var/sig/gdal/data.zip
    cd /var/sig/gdal/ && sudo unzip data.zip

Next, you have to:
 - include the newly created directory /var/sig/gdal/NativeLibs/ in the `LD_LIBRARY_PATH` environment variable
 - create a GDAL_DATA environment variable (eg: export GDAL_DATA="/var/sig/gdal/data")

```
sudo nano /etc/default/tomcat6
```

```
LD_LIBRARY_PATH=/lib:/usr/lib/:/var/sig/gdal/NativeLibs/:$LD_LIBRARY_PATH
```

Another way to install the GDAL Java binding is building it from sources. See http://trac.osgeo.org/gdal/wiki/GdalOgrInJavaBuildInstructionsUnix.

Production ready setup
======================

The above setup is great for testing purposes.

If you plan to use geOrchestra with a large number of users, or if high availability is a concern, it is recommended to split the webapps across several Tomcat instances, eventually load balancing GeoServer. 

The recommended production setup is to have 2 or 3 tomcat instances:
 - one for the security proxy and CAS
 - one for geoserver
 - one for all the other webapps

There is no tutorial for this at the moment, so feel free to ask for guidance on the https://groups.google.com/forum/#!forum/georchestra-dev mailing list.
