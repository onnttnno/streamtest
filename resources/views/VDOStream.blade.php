<!doctype html>
<html lang="{{ app()->getLocale() }}">
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Stream</title>

        <!-- Fonts -->
        <link href="https://fonts.googleapis.com/css?family=Raleway:100,600" rel="stylesheet" type="text/css">
       

       
        <!-- Latest compiled and minified CSS -->
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous">

        <!-- Optional theme -->
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap-theme.min.css" integrity="sha384-rHyoN1iRsVXV4nD0JutlnGaslCJuC7uwjduW9SVrLvRYooPp2bWYgmgJQIXwl/Sp" crossorigin="anonymous">       
        <script type="text/javascript" src="{{ URL::asset('js/jquery-3.1.0.min.js') }}"></script>
        <script type="text/javascript" src="{{ URL::asset('js/jquery.cookie.js') }}"></script>
        <script type="text/javascript" src="{{ URL::asset('js/stream.js') }}"></script>
        <!--- js lib for rtsp--->
        <script type="text/javascript" src="{{ URL::asset('js/socket.io.js') }}"></script>
        <script type="text/javascript" src="https://cdn.WebRTC-Experiment.com/RecordRTC.js"></script>
    </style>
    </head>
    <body>
        <div class="container-fluid">
            <!--row 1 header-->
            <div class="row">
                <div class="col-xs-6 col-xs-offset-6 col-md-4 col-md-offset-4">
                    <h1>Streaming</h1>
                </div>
            </div>
            <!--row 2 Vdo and status-->
            <div class="row">
                <div class="col-xs-6 col-xs-offset-6 col-md-4 col-md-offset-4">
                        <input type="hidden" id="userAgent" name="userAgent" value="" />

                    <h2><button id="btn-solution" type="button" class="btn btn-success"  onclick="start()">start</button></h2>
                    <h2 id="url"></h2>
                    <div class="div-section">
                        <video id="localVideo" autoplay muted style="height:480px;"></video>
                    </div>
                </div>
            </div>
        </div>
    </body>
    <script type="text/javascript">
        document.getElementById("userAgent").value = navigator.userAgent;
        pageReady();
    </script>
</html>
