deimos
============

This module makes it easy to process and respond to JSON-RPC (1.0 and 2.0) messages.

JSON-RPC is an extremely simple format to communicate between the client (for example browser) and the host (server).
It's an easy way to run functions server side by providing the server the function name that needs to be executed and the params alongside with it.
Server runs this function and returns the results for it.

Illustrating pseudocode

    --> RUN FUNCTION "add_comment" WITH "user", "this is cool!"
    <-- RETURN add_comment("user", "this is cool")


The full JSON-RPC specification links:
http://groups.google.com/group/json-rpc/web/json-1-0-spec
http://groups.google.com/group/json-rpc/web/json-rpc-2-0
http://groups.google.com/group/json-rpc/web/json-rpc-over-http


Installation
------------

You can install this package through npm

    npm install deimos

After this you can require the RpcHandler with

    var rpc = require('deimos').RpcHandler;


Server side node.JS
-------------------

Main handler for the RPC request is deimos.RpcHandler - this is a constructor function that handles the RPC request all the way to the final output. You don't have to call response.end() for example, this is done by the handler object.

    var RpcHandler = require('deimos').RpcHandler;
    new RpcHandler(request, response, rpcMethods, debug=false);

RPChandler construtor takes the following parameters

 - request: http.ServerRequest object
 - response: http.ServerResponse object
 - rpcMethods: object that holds all the available methods
       rpcMethods: {
           method_name: function(rpc){
               rpc.response("hello world!");
           }
       }
 - debug (optional) boolean value indicating if real error messages
   should be used in case of runtime errors

*Example script*

Server accepts method calls for "check" - this method checks if the two used parameters are equal or not.

    var http = require("http"),
        RpcHandler = require("jsonrpc").RpcHandler;

    // start server
    http.createServer(function (request, response) {
        if(request.method == 'POST') {
            // if POST request, handle RPC
            new RpcHandler(request, response, rpcMethods, true);
        } else {
            // if GET request response with greeting
            response.writeHead(200, {"Content-Type": "text/plain"});
            response.end("Hello world!");
        }
    }).listen(80);

    // Available RPC methods
    rpcMethods = {
        check: function(rpc, args) {
            if (!isArray(args) ||
                args.length != 2) {
                rpc.invalidParams();
                return;
            }

            if (args[0] == args[1]) {
                rpc.response('Params are OK!');
            } else {
                rpc.response('Params doesn\'t match!');
            }
        }
    }

Cliend side JavaScript
----------------------

To send a RPC call to the server, the message needs to be sent as the request body. This can't be done with forms (as form data is urlencoded etc.) but can be done with AJAX calls.

#### Request message formatting:

    {
        "method": "method name to run",
        "params": ["array", "of", "params"],
        "id":     "id value (optional)"
    }

If `id` value is not set, then server takes this as a notification and return nothing (output is empty).
Parameter values are given to the RPC method as an array:

    "params": ["val1", "val2", "val3"]

Will be used as

    method = function(rpc, params){
        console.log(param[0]); //val1
        console.log(param[1]); //val2
        console.log(param[2]); //val3
    }

The first parameter passed to the method is the RpcHandler object. It has two public methods - `response` and `error`.

    rpc.response("This is the normal response output");
    rpc.error("This is the output in case of error");

After you send the response (be it either `response` or `error` the http.ServerResponse connection is closed so you can't do much after it.

#### Server response

    {
        "result": "some kind of output, or null id error occured",
        "error" : "null or an error message",
        "id"    : "the same id value that was used wit the request"
    }

`result` can be any type (string, number, boolean, object, array).

For example if we need to run a RPC method named "check" with params "value" and "other" then we can do it like this (using Prototype library):

    new Ajax.Request("/path/to/rpc",{
        method: "post",
        postBody: Object.toJSON(
            {
                method: "check",
                params: ["value","other"],
                id:     1
            }),
        onComplete: function(response){
            var r = response.responseText.evalJSON();
            if(r.error)
                alert("ERROR: "+r.error);
            else
                alert("OK: "+r.result);
        }
    });

Sample message traffic
----------------------

    --> {method:"check", params: ["value", "other"], id: 1}
    <-- {result:null, error:"Params doesn't match!", id: 1}

    --> {method:"check", params: ["value", "value"], id: 2}
    <-- {result:"Params are OK!", error:null, id: 2}
