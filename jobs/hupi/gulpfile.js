//A2C Front 2018

'use strict';

//REQUIRES

var gulp     = require('gulp');
var sass     = require('gulp-sass');
var concat   = require('gulp-concat');
var uglify   = require('gulp-uglify');
var notify   = require('gulp-notify');

//REQUIRES
//CONFIGS

var srcPath = 'content/source/';
var distPath = 'content/assets/';

//CONFIGS
//SASS

gulp.task('sass', function (done) {
    return gulp.src( srcPath + 'sass/*.scss')
        .pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
        .pipe(gulp.dest( distPath + 'css'));

    done();
});

//SASS
//SCRIPTS

var jsFiles = [
    srcPath + 'scripts/vendor/_jquery.js',
    srcPath + 'scripts/vendor/fancybox.js',
    srcPath + 'scripts/vendor/swiper.js',
    srcPath + 'scripts/controllers/controllerCommon.js',
    srcPath + 'scripts/app.js',
];

gulp.task('scripts', function(done) {
    return gulp.src(jsFiles)
        .pipe(concat('main.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest( distPath + 'scripts'));

    done();
});

//SCRIPTS
//WATCH

gulp.task('listen', function (done) {

    gulp.watch( srcPath + 'sass/*.sass', gulp.series('sass'));
    gulp.watch( srcPath + 'sass/**/*.scss', gulp.series('sass'));

    gulp.watch( srcPath + 'scripts/app.js', gulp.series('scripts'));
    gulp.watch( srcPath + 'scripts/vendor/*.js', gulp.series('scripts'));

    gulp.watch( srcPath + 'scripts/controllers/*.js', gulp.series('scripts'));

    done();
});

//WATCH