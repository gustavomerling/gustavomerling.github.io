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

var srcPath = 'source/';
var distPath = 'public/';

//CONFIGS
//SASS

gulp.task('sass', function () {
    return gulp.src( srcPath + 'sass/*.sass')
        .pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
        .pipe(gulp.dest( distPath + 'css'))
        .pipe(notify('SASS OK!'));
});

//SASS
//SCRIPTS

var jsFiles = [
    'source/js/vendor/jquery.js',
    'source/js/vendor/swiper.js',
    'source/js/vendor/validation.js',
    'source/js/vendor/mask.js',
    'source/js/vendor/require.js',
    'source/js/app.js',
];

gulp.task('scripts', function() {
    return gulp.src(jsFiles)
        .pipe(concat('main.js'))
        .pipe(uglify())
        .pipe(gulp.dest( distPath + 'js'))
        .pipe(notify('Scripts OK!'));
});

//SCRIPTS
//CONTROLLERS

gulp.task('controllers', function() {
    gulp.src( srcPath + 'js/controllers/*.js')
        .pipe(uglify())
        .pipe(gulp.dest( distPath + 'js/controllers'));
        return gulp.src('/').pipe(notify('Controllers OK!'));
});

//CONTROLLERS
//WATCH

gulp.task('w', function () {

    gulp.watch( srcPath + 'sass/*.sass', ['sass']);
    gulp.watch( srcPath + 'sass/**/*.scss', ['sass']);

    gulp.watch( srcPath + 'js/app.js', ['scripts']);
    gulp.watch( srcPath + 'js/vendor/*.js', ['scripts']);

    gulp.watch( srcPath + 'js/controllers/*.js', ['controllers']);

});

//WATCH