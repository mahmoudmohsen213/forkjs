# forkjs
A light weight node module that tracks a collection of async calls, and notify the main caller when all of them are done through the provided 'then' handler passed to the promise returned from the join method, and forward the arguments passed to the callbacks by the observed calls. The only requirement is that the provided async calls accept a callback as their last parameter. Note: if an async call invoke its callback more than once, the parameters passed to the last invocation will overwrite the previous ones.

## Use case:
This module works for fork-join situations, when we have a number of asynchronous functions, which will be called one after the other and executed asynchronously but we want to collect the returned values provided through callbacks from all functions, and use them all together.

## Usage:
The module exports a constructor function which can be used to create new instances of the object
```js
var Fork = require('fork');
var fork1 = new Fork();
var fork2 = new Fork();
```
here fork1 and fork2 are two distinct objects.

The module exposes five functions .on(), .fork(), .forkWithCallback(), .remove() and .join().

#### .on(eventName, eventHandler)
Used to register event handlers, currently there is one event in use which is 'callback' event. eventName should be a string for example 'callback'. eventHandler should be a function object.

The 'callback' event is triggered when any of the observed functions call its callback. Note that if the observed function is added with a specific callback for it, it will also be invoked in addition to triggering this event, so we can have a specific callback for each observed call, a general callback when any of them finishes, and a final callback when all of them finish.
```js
fork1.on('callback', function(args){
  console.log('fork callback event:');
  console.log(args);
});
```
#### .fork(async_function[, ...args])
Used to add an asynchronous function. The other parameters are the parameters to be passed to the async_function on its invokation, except the callback. The module injects a function as a callback to collect the callback arguments, and notify the main caller through a promise.
```js
// assume test1 and test2 are two asynchronous functions
function test1(param1, param2, callback){
  // some asynchronous code
}

function test2(param1, param2, param3, callback){
  // some asynchronous code
}

fork1.fork(test1, 'test1param1', 'test1param2');
fork1.fork(test2, 'test2param1', 'test2param2', 'test2param3');
```
note that the passed function must consider its last argument as a callback. For example, setTimeout() take the callback as the first argument, to use it we need a wrapper to rearrange the arguments
```js
function test3(param1, param2, callback){
  setTimeout(callback, 6000, param1, param2);
}
```
#### .forkWithCallback(async_function, callback[, ...args])
It is the same as 'fork', but takes the second paramter as a callback specific to the newly added async function to be called when the newly added function call its callback.
```js
function test3(param1, param2, callback){
  setTimeout(function(){
    console.log('test3: ', param1, param2);
    callback('test3 callback param1', 'test3 callback param2');
  }, 5000);
}

function test3Callback(param1, param2){
  console.log('test3Callback: ', param1, param2);
}

fork1.forkWithCallback(test3, test3Callback, 'test3param5', 'test3param6');
```
#### .join()
Calling this function will invoke all the added asynchronous functions. Any attempt to call .join() again will result in an error until all observed calls finishes and call their callbacks.

This function returns a promise, which is resolved wfter all functions call their callbacks, the promise is resolved with the collected callback arguments, passed by the observed asynchronous functions to their callbacks.

The 'then' handler should take one argument which is an array of arrays, the i-th array is a collection of the arguments passed to the callback by i-th observed call in the order of addition.
```js
fork1
  .join()
  .then(args => {
    console.log('fork end event:');
    console.log(args);
  });
```

## Full code sample:
```js
var Fork = require('fork');
var fork = new Fork();

function test1(param1, param2, callback){
  setTimeout(function(){
    console.log('test1: ', param1, param2);
    callback('test1 callback ' + param1);
  }, 8000);
}
 
function test2(param1, param2, param3, callback){
  setTimeout(function(){
    console.log('test2: ', param1, param2, param3);
    callback('test2 callback');
  }, 2000);
}

function test3(param1, param2, callback){
  setTimeout(function(){
    console.log('test3: ', param1, param2);
    callback('test3 callback param1', 'test3 callback param2');
  }, 5000);
}

function test3Callback(param1, param2){
  console.log('test3Callback: ', param1, param2);
}

fork
  .fork(test1, 'test1param1', 'test1param2')
  .fork(test2, 'test2param1', 'test2param2', 'test2param3')
  .fork(test1, 'test1param3', 'test1param4')
  .forkWithCallback(test3, test3Callback, 'test3param5', 'test3param6')
  .on('callback', function(args){
    console.log('fork callback event:');
    console.log(args);
  });
 
fork
  .join()
  .then(args => {
  console.log('fork end event:');
    console.log(args);
  });
```
