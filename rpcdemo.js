var http = require("http"),
    RpcHandler = require("./jsonrpc").RpcHandler;

// start server
http.createServer(function (request, response) {
    if(request.method == "POST"){
        // if POST request, handle RPC
        new RpcHandler(request, response, rpcMethods, true);
    }else{
        // if GET request response with greeting
        response.end("Hello world!");
    }
}).listen(8000);
console.log("running")

// Define available RPC methods
rpcMethods = {
    insert: function(rpc, args){
        if (args[0] != args[1])
            rpc.error("Params doesn't match!");
        else
            rpc.response("Params are OK!");
    }
}