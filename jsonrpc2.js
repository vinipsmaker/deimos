////////////////////////////////////////////////////////////////////////////
// All rights reserved.                                                   //
//                                                                        //
// Redistribution and use in source and binary forms, with or without     //
// modification, are permitted provided that the following conditions are //
// met:                                                                   //
//                                                                        //
//     * Redistributions of source code must retain the above copyright   //
//       notice, this list of conditions and the following disclaimer.    //
//                                                                        //
//     * Redistributions in binary form must reproduce the above          //
//       copyright notice, this list of conditions and the following      //
//       disclaimer in the documentation and/or other materials provided  //
//       with the distribution.                                           //
//                                                                        //
//     * Neither the name of the Massachusetts Institute of Technology    //
//       nor the names of its contributors may be used to endorse or      //
//       promote products derived from this software without specific     //
//       prior written permission.                                        //
//                                                                        //
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS    //
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT      //
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR  //
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT   //
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,  //
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT       //
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,  //
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY  //
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT    //
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE  //
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.   //
////////////////////////////////////////////////////////////////////////////
/*
 * JSON-RPC 1.0 and 2.0
 * http://groups.google.com/group/json-rpc/web/json-1-0-spec
 * http://groups.google.com/group/json-rpc/web/json-rpc-2-0
 * 
 * Manages RPC-JSON messages
 * 
 * Sample usage:
 * 
 *     var http = require("http");
 *     var RpcHandler = require("jsonrpc2").RpcHandler;
 * 
 *     rpcMethods = {
 *         insert: function(rpc, args) {
 *             if (args[0] != args[1]) {
 *                 rpc.error("Params doesn't match!");
 *             } else {
 *                 rpc.response("Params are OK!");
 *             }
 *         }
 *     }
 *
 *     http.createServer(function (request, response) {
 *         if (request.method == "POST") {
 *             new RpcHandler(request, response, rpcMethods, true);
 *         } else {
 *             response.end("Hello world!");
 *         }
 *     }).listen(80);
 * 
 * Sample message traffic:
 * 
 * --> {"jsonrpc": "2.0", "method": "insert", "params": ["value", "other"], "id": 1}
 * <-- {"jsonrpc": "2.0", "error": "Params doesn't match!", "id": 1}
 * 
 * --> {"jsonrpc": "2.0", "method": "insert", "params": ["value", "value"], "id": 2}
 * <-- {"jsonrpc": "2.0", "result": "Params are OK!", "id": 2}
 * 
 */

/**
 * new RpcHandler(request, response, methods, debug)
 * - request (Object): http.ServerRequest object
 * - response (Object): http.ServerResponse object
 * - methods (Object): available RPC methods. 
 *       methods = {insert: function(rpc, args){})
 * - debug (Boolean): If TRUE use actual error messages on runtime errors
 * 
 * Creates an RPC handler object which parses the input, forwards the data
 * to a RPC method and outputs response messages.
 */
function RpcHandler(request, response, methods, debug) {
    this.request = request;
    this.response = response;
    this.methods = methods;
    this.debug = !!debug;
    this.json = false;
    
    if (typeof this.methods == "object" &&
        this.request && this.response) {
        this._handleRequest();
    } else  {
        throw new Error("Invalid params");
    }
}

exports.RpcHandler = RpcHandler;

//////////// PUBLIC METHODS ////////////

/**
 * RpcHandler.prototype.error = function(error) -> Boolean
 * - error (String): Error message
 * 
 * Sends an error message if error occured.
 * Returns true if a message was sent and false if blank was sent
 */
RpcHandler.prototype.error = function(error) {
    this._output(false, error);
}

/**
 * RPCHandler.prototype.response = function(result) -> Boolean
 * - result (String): Response message
 * 
 * Sends the response message if everything was successful
 * Returns true if a message was sent and false if blank was sent
 */
RpcHandler.prototype.response = function(result) {
    this._output(result, false);    
}

//////////// PRIVATE METHODS ////////////

/**
 * RpcHandler._run() -> undefined
 * 
 * Checks if input is correct and passes the params to an actual RPC method
 **/
RpcHandler.prototype._run = function() {
    if (!this.methods)
        return this.error("No methods", this.id);

    // TODO: use a different error for each condition
    if (!this.json.method ||
        !(this.json.method in this.methods) ||
        typeof this.methods[this.json.method] != "function")
        return this.error("Invalid request method", this.id);

    // TODO: check if params are okay
    try {
        this.methods[this.json].method(this, this.json.params);
    } catch(e) {
        rpcHandler.error(rpcHandler.debug ? e.message : "Runtime error", -1);
    }
}

// TODO: erase this function
/**
 * RpcHandler._output(result, error) -> Boolean
 * - result (String): response message
 * - error (String): error message
 * 
 * Creates the response, outputs it and closes the connection.
 * Returns true if a message was sent and false if blank was sent
 **/
RpcHandler.prototype._output = function(result, error){
    this.response.writeHead(error ? 500 : 200,
                            {"Content-Type": "application/json"});
    if (!("id" in this) || this.id === null) {
        this.response.end();
        return false;
    } else {
        this.response.end(JSON.stringify({
            result: error ? null : result,
            error: error ? error : null,
            id: this.id
        }));
        return true;
    }
}

/**
 * RpcHandler._handleRequest() -> undefined
 * 
 * Checks if request is valid and handles all errors
 */
RpcHandler.prototype._handleRequest = function() {
    this.request.setEncoding('utf8');
    var rpcHandler = this;
    this._handleBodyRequest(function(json) {
        rpcHandler.json = json;
        if ("id" in json)
            rpcHandler.id = json.id;
        
        rpcHandler._run();
    });
}

// TODO: limit the maximum-size of the body
// add option to use a temporary file as buffer
/**
 * RpcHandler._handleRequestBody(callback) -> undefined
 * - callback (Function): callback function to be called with the complete body
 * 
 * Parses the request body into one larger string
 */
RpcHandler.prototype._handleRequestBody = function (callback) {
    var content = '';

    this.request.addListener('data', function(chunk){
        content += chunk;
    });

    this.request.addListener('end', function(){
        callback(JSON.parse(content));
    });
}
