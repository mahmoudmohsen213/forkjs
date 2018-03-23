/* 
 * A node module that tracks a collection of async calls, and notify the main 
 * caller when all of them are done through the provided 'then' handler passed
 * to the promise returned from the join method, and forward the arguments 
 * passed to the callbacks by the observed calls.
 * The only requirement is that the provided async calls accept a callback as
 * their last parameter.
 * Note: if an async call invoke its callback more than once, the parameters
 * passed to the last invocation will overwrite the previous ones
 */

// events
const EVENT_CALLBACK = 'callback';

// states
const STATE_PENDING = 'pending';
const STATE_RUNNING = 'running';
const STATE_DONE = 'done';

function Fork() {
  const self = this;
  self.observedCalls = [];
  self.observedCallsArguments = [];
  self.callbacks = [];
  self.collectedCallbackArguments = [];
  self.eventHandlers = {};
  self.runningCalls = 0;
  self.state = STATE_PENDING;
  self.onCompletion = null;

  // set the event handler of each event
  self.on = function (eventName, eventHandler) {
    if (typeof eventName !== 'string')
      throw new TypeError('the first argument must be a string object');

    if (typeof eventHandler !== 'function')
      throw new TypeError('the second argument must be a function object');

    self.eventHandlers[eventName] = eventHandler;
    return self;
  };

  // collect the arguments passed to the callbacks from the observed async calls
  self.collectCallbackArguments = function (callbackArgsWrapper) {
    self.collectedCallbackArguments[callbackArgsWrapper.callerIndex] = callbackArgsWrapper.args;
    self.runningCalls--;

    if (self.callbacks[callbackArgsWrapper.callerIndex])
      self.callbacks[callbackArgsWrapper.callerIndex](...(callbackArgsWrapper.args));

    if (self.eventHandlers[EVENT_CALLBACK])
      self.eventHandlers[EVENT_CALLBACK](...(callbackArgsWrapper.args));

    if ((self.runningCalls === 0) && (self.onCompletion)) {
      self.state = STATE_DONE;
      self.onCompletion(self.collectedCallbackArguments);
    }
  };

  // accepts the function to be observed, in addition to an arbtrary number of
  // parameters to be passed to the observed function on its invokation
  self.fork = function (observedCall, ...args) {
    if (typeof observedCall !== 'function')
      throw new TypeError('the first argument must be a function object');

    self.observedCalls.push(observedCall);
    self.observedCallsArguments.push(args);
    self.callbacks.push(null);
    self.collectedCallbackArguments.push(null);
    return self;
  };

  // accepts the function to be observed, and a specific callback to be
  // called on its return, note that the on 'end' event will still be triggerd
  self.forkWithCallback = function (observedCall, callback, ...args) {
    if (typeof observedCall !== 'function')
      throw new TypeError('the first argument must be a function object');

    if (typeof callback !== 'function')
      throw new TypeError('the second argument must be a function object');

    self.observedCalls.push(observedCall);
    self.observedCallsArguments.push(args);
    self.callbacks.push(callback);
    self.collectedCallbackArguments.push(null);
    return self;
  };

  // remove a previously added async call
  self.remove = function (index, howmany) {
    self.observedCalls.splice(index, howmany);
    self.observedCallsArguments.splice(index, howmany);
    self.callbacks.splice(index, howmany);
    self.collectedCallbackArguments.splice(index, howmany);
    return self;
  }

  // invoke all async calls
  self.join = function () {
    if (self.state !== STATE_PENDING)
      throw new Error('this fork are already running');
    
    return new Promise((resolve, reject) => {
      self.onCompletion = resolve;
      self.state = STATE_RUNNING;
      self.runningCalls = self.observedCalls.length;
      self.observedCalls.forEach((observedCall, index) => {
        let immutableIndex = index;
        self.observedCallsArguments[immutableIndex].push((...callbackArgs) => {
          self.collectCallbackArguments({ callerIndex: immutableIndex, args: callbackArgs });
        });

        self.observedCalls[immutableIndex](...(self.observedCallsArguments[immutableIndex]));
      });
    });
  };
}

module.exports = Fork;