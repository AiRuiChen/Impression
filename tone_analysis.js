<!DOCTYPE html>
<html>
<head>
    <title>Speech Sample</title>
    <meta charset="utf-8" />
</head>
<body style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px;">
    <div id="warning">
        <h1 style="font-weight:500;">Speech Recognition SDK not found.</h1>
        <h2 style="font-weight:500;">Please execute <code>npm run bundle</code> and reload.</h2>
    </div>
    <div id="content" style="display:none">
        <table width="100%">
            <tr>
                <td></td>
                <td>
                    <h1 style="font-weight:500;">Speech Recognition</h1>
                    <h2 style="font-weight:500;">Microsoft Cognitive Services</h2>
                </td>
            </tr>
            <tr>
                <td align="right"><a href="https://www.microsoft.com/cognitive-services/en-us/sign-up" target="_blank">Subscription</a>:</td>
                <td><input id="key" type="text" size="40" value="YOUR_BING_SPEECH_API_KEY"></td>
            </tr>
            <tr>
                <td align="right">Language:</td>
                <td align="left">
                    <select id="languageOptions">
                        <option value="ar-EG">Arabic - EG</option>
                        <option value="zh-CN">Chinese - CN</option>
                        <option value="en-GB">English - GB</option>
                        <option value="en-US" selected="selected">English - US</option>
                        <option value="fr-FR">French - FR</option>
                        <option value="de-DE">German - DE</option>
                        <option value="it-IT">Italian - IT</option>
                        <option value="ja-JP">Japanese - JP</option>
                        <option value="pt-BR">Portuguese - BR</option>
                        <option value="ru-RU">Russian - RU</option>
                        <option value="es-ES">Spanish - ES</option>
                    </select>
                </td>
            </tr>
            <tr>
                <td align="right">Recognition Mode:</td>
                <td align="left">
                    <select id="recognitionMode">
                        <option value="Interactive">Interactive</option>
                        <option value="Conversation">Conversation</option>
                        <option value="Dictation">Dictation</option>
                    </select>
                </td>
            </tr>
            <tr>
                <td align="right">Format:</td>
                <td align="left">
                    <select id="formatOptions">
                        <option value="Simple" selected="selected">Simple Result</option>
                        <option value="Detailed">Detailed Result</option>
                    </select>
                </td>
            </tr>
            <tr>
                <td align="right">Input:</td>
                <td align="left">
                    <select id="inputSource">
                        <option value="Mic" selected="selected">Microphone</option>
                        <option value="File">Audio File</option>
                    </select>
                </td>
            </tr>
            <tr>
                <td></td>
                <td>
                    <button id="startBtn" disabled="disabled">Start</button>
                    <button id="stopBtn" disabled="disabled">Stop</button>
                    <input type="file" id="filePicker" accept=".wav" style="display:none"/>
                </td>
            </tr>
            <tr>
                <td></td>
                <td>
                    <table>
                        <tr>
                            <td>Results:</td>
                            <td>Current hypothesis:</td>
                        </tr>
                        <tr>
                            <td>
                                <textarea id="phraseDiv" style="display: inline-block;width:500px;height:200px"></textarea>
                            </td>
                            <td style="vertical-align: top">
                                <span id="hypothesisDiv" style="width:200px;height:200px;display:block;"></span>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td align="right">Status:</td>
                <td align="left"><span id="statusDiv"></span></td>
            </tr>
        </table>
    </div>

    <!-- SDK REFERENCE -->
    <script src="../../distrib/speech.sdk.bundle.js"></script>

    <!-- SDK USAGE -->
    <script>
        // On document load resolve the SDK dependency
        function Initialize(onComplete) {
            if (!!window.SDK) {
                document.getElementById('content').style.display = 'block';
                document.getElementById('warning').style.display = 'none';
                onComplete(window.SDK);
            }
        }
        
        // Setup the recognizer
        function RecognizerSetup(SDK, recognitionMode, language, format, subscriptionKey) {
            
            switch (recognitionMode) {
                case "Interactive" :
                    recognitionMode = SDK.RecognitionMode.Interactive;    
                    break;
                case "Conversation" :
                    recognitionMode = SDK.RecognitionMode.Conversation;    
                    break;
                case "Dictation" :
                    recognitionMode = SDK.RecognitionMode.Dictation;    
                    break;
                default:
                    recognitionMode = SDK.RecognitionMode.Interactive;
            }

            var recognizerConfig = new SDK.RecognizerConfig(
                new SDK.SpeechConfig(
                    new SDK.Context(
                        new SDK.OS(navigator.userAgent, "Browser", null),
                        new SDK.Device("SpeechSample", "SpeechSample", "1.0.00000"))),
                recognitionMode,
                language, // Supported languages are specific to each recognition mode. Refer to docs.
                format); // SDK.SpeechResultFormat.Simple (Options - Simple/Detailed)


            var useTokenAuth = false;
            
            var authentication = function() {
                if (!useTokenAuth)
                    return new SDK.CognitiveSubscriptionKeyAuthentication(subscriptionKey);

                var callback = function() {
                    var tokenDeferral = new SDK.Deferred();
                    try {
                        var xhr = new(XMLHttpRequest || ActiveXObject)('MSXML2.XMLHTTP.3.0');
                        xhr.open('GET', '/token', 1);
                        xhr.onload = function () {
                            if (xhr.status === 200)  {
                                tokenDeferral.Resolve(xhr.responseText);
                            } else {
                                tokenDeferral.Reject('Issue token request failed.');
                            }
                        };
                        xhr.send();
                    } catch (e) {
                        window.console && console.log(e);
                        tokenDeferral.Reject(e.message);
                    }
                    return tokenDeferral.Promise();
                }

                return new SDK.CognitiveTokenAuthentication(callback, callback);
            }();
            
            var files = document.getElementById('filePicker').files;
            if (!files.length) {
                return SDK.CreateRecognizer(recognizerConfig, authentication);
            } else {
                return SDK.CreateRecognizerWithFileAudioSource(recognizerConfig, authentication, files[0]);
            }
        }

        // Start the recognition
        function RecognizerStart(SDK, recognizer) {
            recognizer.Recognize((event) => {
                /*
                 Alternative syntax for typescript devs.
                 if (event instanceof SDK.RecognitionTriggeredEvent)
                */
                switch (event.Name) {
                    case "RecognitionTriggeredEvent" :
                        UpdateStatus("Initializing");
                        break;
                    case "ListeningStartedEvent" :
                        UpdateStatus("Listening");
                        break;
                    case "RecognitionStartedEvent" :
                        UpdateStatus("Listening_Recognizing");
                        break;
                    case "SpeechStartDetectedEvent" :
                        UpdateStatus("Listening_DetectedSpeech_Recognizing");
                        console.log(JSON.stringify(event.Result)); // check console for other information in result
                        break;
                    case "SpeechHypothesisEvent" :
                        UpdateRecognizedHypothesis(event.Result.Text, false);
                        console.log(JSON.stringify(event.Result)); // check console for other information in result
                        break;
                    case "SpeechFragmentEvent" :
                        UpdateRecognizedHypothesis(event.Result.Text, true);
                        console.log(JSON.stringify(event.Result)); // check console for other information in result
                        break;
                    case "SpeechEndDetectedEvent" :
                        OnSpeechEndDetected();
                        UpdateStatus("Processing_Adding_Final_Touches");
                        console.log(JSON.stringify(event.Result)); // check console for other information in result
                        break;
                    case "SpeechSimplePhraseEvent" :
                        UpdateRecognizedPhrase(JSON.stringify(event.Result, null, 3));
                        break;
                    case "SpeechDetailedPhraseEvent" :
                        UpdateRecognizedPhrase(JSON.stringify(event.Result, null, 3));
                        break;
                    case "RecognitionEndedEvent" :
                        OnComplete();
                        UpdateStatus("Idle");
                        console.log(JSON.stringify(event)); // Debug information
                        break;
                    default:
                        console.log(JSON.stringify(event)); // Debug information
                }
            })
            .On(() => {
                // The request succeeded. Nothing to do here.
            },
            (error) => {
                console.error(error);
            });
        }

        // Stop the Recognition.
        function RecognizerStop(SDK, recognizer) {
            // recognizer.AudioSource.Detach(audioNodeId) can be also used here. (audioNodeId is part of ListeningStartedEvent)
            recognizer.AudioSource.TurnOff();
        }
    </script>






// analyzing tone
var ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');

var tone_analyzer = new ToneAnalyzerV3({
  username: '50a9be9c-b43b-4ba8-8893-f4fc971fd2b7',
  password: 'JR3uHXNzE0jb',
  version_date: '2017-09-21'
});

var params = {
  'text': '2016-05-19: A comma-separated list of tones for which the service is to return its analysis of the input. The indicated tones apply both to the full document and to individual sentences of the document. You can specify one or more of the following values:',
  'content_type': 'text/plain'
};


tone_analyzer.tone(params, function(error, response) {
  if (error)
    console.log('error:', error);
  else
    console.log(JSON.stringify(response, null, 2));
  }
);