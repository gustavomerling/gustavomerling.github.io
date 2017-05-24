;(function() {

    'use strict';

    var gulp  = require( 'gulp' ),
    changed   = require( 'gulp-changed' ),
    gulpif    = require( 'gulp-if' ),
    sass      = require( 'gulp-sass' ),
    path      = require( 'path' ),
    minifycss = require( 'gulp-minify-css' ),
    plumber   = require( 'gulp-plumber' ),
    concat    = require( 'gulp-concat' ),
    uglify    = require( 'gulp-uglify' ),
    rsync     = require( 'rsyncwrapper' ).rsync,
    notify    = require( 'gulp-notify' );

    var gulpconfig = require( './gulpconfig' );
    var pkg        = require( './package.json' );

    require( 'colors' );

    //-----------------------------------------------------------------

    gulp.task('sass', function () {
        var css_public_path = gulpconfig.dirs.css_public_path;
        gulp.src('sass/style.sass')
        .pipe(sass().on('error', sass.logError))
        .pipe( minifycss() )
        .pipe( gulp.dest( css_public_path ) )
        .pipe( notify( 'SASS OK!' ) );
    });

    gulp.task( 'mainJs', function() {
        var js_public_path = gulpconfig.dirs.js_public_path + '/';
        gulp.src([
            'js/vendor/jquery.js',
            'js/vendor/mask.js',
            'js/vendor/validate.js',
            'js/vendor/require.js',
            'js/app.js',
        ])
        .pipe(concat('main.js'))
        .pipe( uglify() )
        .pipe( gulp.dest( js_public_path ) )
        .pipe( notify( 'mainJs OK!' ) );
    });

    gulp.task( 'controllersJs', function() {
        var js_public_path = gulpconfig.dirs.js_public_path + '/controllers';
        gulp.src([
            'js/controllers/*.js',
        ])
        .pipe( uglify() )
        .pipe( gulp.dest( js_public_path ) )
        .pipe( notify( 'controllersJs OK!' ) );
    });

    gulp.task( 'modulesJs', function() {
        var js_public_path = gulpconfig.dirs.js_public_path + '/modules';
        gulp.src([
            'js/modules/*.js',
        ])
        .pipe( uglify() )
        .pipe( gulp.dest( js_public_path ) )
        .pipe( notify( 'modulesJs OK!' ) );
    });

    // ---------------------------------------------------

    gulp.task( 'watch', function() {
        var dirs = gulpconfig.dirs;

        var watchers = [

            gulp.watch( dirs.css_src_path + '/**/*.scss', ['sass']),
            gulp.watch( dirs.css_src_path + '/**/*.sass', ['sass']),

            gulp.watch( 'js/*.js', [ 'mainJs' ] ),
            gulp.watch( 'js/vendor/*.js', [ 'mainJs' ] ),
            gulp.watch( 'js/controllers/*.js', [ 'controllersJs' ] ),
            gulp.watch( 'js/modules/*.js', [ 'modulesJs' ] )

        ];

        watchers.forEach(function( watcher ) {
            watcher.on( 'change', function( e ) {
                // Get just filename
                var filename = e.path.split( '/' ).pop();
                var bars = '\n================================================';

                console.log( ( bars + '\nFile ' + filename + ' was ' + e.type + ', runing tasks...' + bars ).toUpperCase() );
            });
        });
    });

    // ---------------------------------------------------

    gulp.task( 'rsync-staging', function() {
        var rsyncConfig = gulpconfig.rsyncConfig;
        rsyncConfig.options.src = rsyncConfig.staging.src;
        rsyncConfig.options.dest = rsyncConfig.staging.dest;

        return rsync(
            rsyncConfig.options,
            function( err, stdout, stderr, cmd ) {
                console.log( 'Shell command was:', cmd.cyan );

                if( err ) {
                    return console.log( err.message.red );
                }

                console.log( 'Success!', stdout.grey );
            }
        );
    });

    // ---------------------------------------------------

    gulp.task( 'rsync-production', function() {
        var rsyncConfig = gulpconfig.rsyncConfig;
        rsyncConfig.options.src = rsyncConfig.production.src;
        rsyncConfig.options.dest = rsyncConfig.production.dest;

        return rsync(
            rsyncConfig.options,
            function( err, stdout, stderr, cmd ) {
                console.log( 'Shell command was:', cmd.cyan );

                if( err ) {
                    return console.log( err.message.red );
                }

                console.log( 'Success!', stdout.grey );
            }
        );
    });

    // ---------------------------------------------------

    /**
     * Execution Tasks
     */
    gulp.task( 'default', [ 'sass', 'mainJs', 'controllersJs' , 'modulesJs' ] );
    gulp.task( 'ftp', [ 'ftp-deploy' ] );
    gulp.task( 'bs', [ 'watch', 'browser-sync' ] );



    /**
     * Short aliases
     */
    gulp.task( 'w', [ 'watch' ] );
    gulp.task( 'o', [ 'optimize' ] );
    gulp.task( 'f', [ 'ftp' ] );
    gulp.task( 'rs', [ 'rsync-staging' ] );
    gulp.task( 'rp', [ 'rsync-production' ] );
    gulp.task( 'r', [ 'rsync-staging', 'rsync-production' ] );

})();
