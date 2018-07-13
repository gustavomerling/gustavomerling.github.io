;(function() {

'use strict';

// ---------------------------------------------------

exports.dirs = (function() {
    var theme_name = 'lepper';

    var src_path = '.';
    var theme_path = '..';
    var public_path = theme_path + '/public';


    return {
        src_path : src_path,
        theme_path : theme_path,
        public_path : public_path,

        css_src_path : src_path + '/sass',
        js_src_path  : src_path + '/js',
        img_src_path : src_path + '/images',

        css_public_path : public_path + '/css',
        js_public_path  : public_path + '/js',
        img_public_path : public_path + '/images',

        deploy : '../'
    };
})();

// ---------------------------------------------------

exports.rsyncConfig = {
    options : {
        args : [ '--verbose', '--progress' ],
        exclude : [
            '.htaccess',
            '.jshintrc',
            '.git*',
            '**.DS_Store',
            '**__MACOSX',
            '*.sublime-*',
            'src',
            'wp-config.php',
            'site/uploads',
            'site/cache',
            'wp-content/uploads',
            'wp-content/cache',
            '.ftpquota',
            'error_log',
            '.editorconfig',
            'cgi-bin',
            '*.zip'
        ],
        recursive : true,
        compareMode : 'checksum',
        syncDestIgnoreExcl : true,
        onStdOut : function( data ) {
            console.log( data );
        }
    },

    staging : {
        src: exports.dirs.deploy,
        dest: 'user@host.com:~/PATH/site'
    },

    production : {
        src: exports.dirs.deploy,
        dest: 'user@host.com:~/PATH/site'
    },

    // ---------------------------------------------------

    images : {
        args : [ '--verbose', '--progress' ],
        exclude : [
            '**.DS_Store',
            '**__MACOSX',
            'icons'
        ],
        recursive : true,
        compareMode : 'checksum',
        src: exports.dirs.img_src_path + '/',
        dest: exports.dirs.img_public_path,
        syncDestIgnoreExcl : true,
        onStdOut : function( data ) {
            console.log( data );
        }
    }
};

// ---------------------------------------------------

})();
