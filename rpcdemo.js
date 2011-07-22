var http = require('http');
var RpcHandler = require('deimos').RpcHandler;
var isArray = require('deimos/utils').isArray;

// Define available RPC methods
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

// start server
http.createServer(function (request, response) {
    if (request.method == 'POST') {
        // if POST request, handle RPC
        new RpcHandler(request, response, rpcMethods, true);
    } else {
        // if GET request response with greeting
        request.writeHead(200, {"Content-Type": "text/plain"});
        response.end('Hello world!');
    }
}).listen(80);