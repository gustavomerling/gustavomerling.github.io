const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const browserSync = require('browser-sync').create();
const concat = require('gulp-concat');
const cleanCSS = require('gulp-clean-css');

// Compilar SASS
gulp.task('sass', function () {
    return gulp.src('content/source/scss/main.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(cleanCSS()) // Minificar o CSS
        .pipe(gulp.dest('content/public/css'))
        .pipe(browserSync.stream());
});

// Compilar e concatenar JavaScript
gulp.task('scripts', function () {
    return gulp.src(['content/source/js/vendor/*.js', 'content/source/js/main.js'])
        .pipe(concat('bundle.js'))
        .pipe(gulp.dest('content/public/js'))
        .pipe(browserSync.stream());
});

// Iniciar servidor local e assistir mudanças nos arquivos
gulp.task('serve', function () {
    browserSync.init({
        server: './',
        port: 4000
    });

    gulp.watch('content/source/scss/**/*.scss', gulp.series('sass'));
    gulp.watch('content/source/js/**/*.js', gulp.series('scripts'));
    gulp.watch('*.html').on('change', browserSync.reload);
});

// Tarefa padrão
gulp.task('default', gulp.series('sass', 'scripts', 'serve'));