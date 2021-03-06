<?php

// autoload_static.php @generated by Composer

namespace Composer\Autoload;

class ComposerStaticInit57b929f0068e2e521b971ee14e44c9b0
{
    public static $prefixLengthsPsr4 = array (
        'C' => 
        array (
            'Com\\Wowza\\' => 10,
        ),
    );

    public static $prefixDirsPsr4 = array (
        'Com\\Wowza\\' => 
        array (
            0 => __DIR__ . '/..' . '/wowza/wse-rest-library-php/src',
        ),
    );

    public static function getInitializer(ClassLoader $loader)
    {
        return \Closure::bind(function () use ($loader) {
            $loader->prefixLengthsPsr4 = ComposerStaticInit57b929f0068e2e521b971ee14e44c9b0::$prefixLengthsPsr4;
            $loader->prefixDirsPsr4 = ComposerStaticInit57b929f0068e2e521b971ee14e44c9b0::$prefixDirsPsr4;

        }, null, ClassLoader::class);
    }
}
