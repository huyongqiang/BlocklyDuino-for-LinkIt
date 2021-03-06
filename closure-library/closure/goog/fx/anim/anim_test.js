// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

goog.provide('goog.fx.animTest');
goog.setTestOnly('goog.fx.animTest');

goog.require('goog.async.AnimationDelay');
goog.require('goog.async.Delay');
goog.require('goog.events');
goog.require('goog.functions');
goog.require('goog.fx.Animation');
goog.require('goog.fx.anim');
goog.require('goog.object');
goog.require('goog.testing.MockClock');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.recordFunction');
goog.require('goog.userAgent');

var clock, replacer;

function setUpPage() {
  clock = new goog.testing.MockClock(true);
}

function tearDownPage() {
  clock.dispose();
}

function setUp() {
  replacer = new goog.testing.PropertyReplacer();
}

function tearDown() {
  replacer.reset();
  goog.fx.anim.tearDown();
}

function testDelayWithMocks() {
  goog.fx.anim.setAnimationWindow(null);
  registerAndUnregisterAnimationWithMocks(goog.async.Delay);
}

function testAnimationDelayWithMocks() {
  goog.fx.anim.setAnimationWindow(window);
  registerAndUnregisterAnimationWithMocks(goog.async.AnimationDelay);
}


/**
 * @param {!Function} delayType The constructor for Delay or AnimationDelay.
 *     The methods will be mocked out.
 */
function registerAndUnregisterAnimationWithMocks(delayType) {
  var timerCount = 0;

  replacer.set(delayType.prototype, 'start', function() { timerCount++; });
  replacer.set(delayType.prototype, 'stop', function() { timerCount--; });
  replacer.set(
      delayType.prototype, 'isActive', function() { return timerCount > 0; });

  var forbiddenDelayType = delayType == goog.async.AnimationDelay ?
      goog.async.Delay :
      goog.async.AnimationDelay;
  replacer.set(forbiddenDelayType.prototype, 'start', goog.functions.error());
  replacer.set(forbiddenDelayType.prototype, 'stop', goog.functions.error());
  replacer.set(
      forbiddenDelayType.prototype, 'isActive', goog.functions.error());

  var anim = new goog.fx.Animation([0], [1], 1000);
  var anim2 = new goog.fx.Animation([0], [1], 1000);

  goog.fx.anim.registerAnimation(anim);

  assertTrue(
      'Should contain the animation',
      goog.object.containsValue(goog.fx.anim.activeAnimations_, anim));
  assertEquals('Should have called start once', 1, timerCount);

  goog.fx.anim.registerAnimation(anim2);

  assertEquals('Should not have called start again', 1, timerCount);

  // Add anim again.
  goog.fx.anim.registerAnimation(anim);
  assertTrue(
      'Should contain the animation',
      goog.object.containsValue(goog.fx.anim.activeAnimations_, anim));
  assertEquals('Should not have called start again', 1, timerCount);

  goog.fx.anim.unregisterAnimation(anim);
  assertFalse(
      'Should not contain the animation',
      goog.object.containsValue(goog.fx.anim.activeAnimations_, anim));
  assertEquals('clearTimeout should not have been called', 1, timerCount);

  goog.fx.anim.unregisterAnimation(anim2);
  assertEquals('There should be no remaining timers', 0, timerCount);

  // Make sure we don't trigger setTimeout or setInterval.
  clock.tick(1000);
  goog.fx.anim.cycleAnimations_(goog.now());

  assertEquals('There should be no remaining timers', 0, timerCount);

  anim.dispose();
  anim2.dispose();
}

function testRegisterAndUnregisterAnimationWithRequestAnimationFrameGecko() {
  // Only FF4 onwards support requestAnimationFrame.
  if (!goog.userAgent.GECKO || !goog.userAgent.isVersionOrHigher('2.0') ||
      goog.userAgent.isVersionOrHigher('17')) {
    return;
  }

  goog.fx.anim.setAnimationWindow(window);

  var anim = new goog.fx.Animation([0], [1], 1000);
  var anim2 = new goog.fx.Animation([0], [1], 1000);

  goog.fx.anim.registerAnimation(anim);

  assertTrue(
      'Should contain the animation',
      goog.object.containsValue(goog.fx.anim.activeAnimations_, anim));

  assertEquals(
      'Should have listen to MozBeforePaint once', 1,
      goog.events.getListeners(window, 'MozBeforePaint', false).length);

  goog.fx.anim.registerAnimation(anim2);

  assertEquals(
      'Should not add more listener for MozBeforePaint', 1,
      goog.events.getListeners(window, 'MozBeforePaint', false).length);

  // Add anim again.
  goog.fx.anim.registerAnimation(anim);
  assertTrue(
      'Should contain the animation',
      goog.object.containsValue(goog.fx.anim.activeAnimations_, anim));
  assertEquals(
      'Should not add more listener for MozBeforePaint', 1,
      goog.events.getListeners(window, 'MozBeforePaint', false).length);

  goog.fx.anim.unregisterAnimation(anim);
  assertFalse(
      'Should not contain the animation',
      goog.object.containsValue(goog.fx.anim.activeAnimations_, anim));
  assertEquals(
      'Should not clear listener for MozBeforePaint yet', 1,
      goog.events.getListeners(window, 'MozBeforePaint', false).length);

  goog.fx.anim.unregisterAnimation(anim2);
  assertEquals(
      'There should be no more listener for MozBeforePaint', 0,
      goog.events.getListeners(window, 'MozBeforePaint', false).length);

  anim.dispose();
  anim2.dispose();

  goog.fx.anim.setAnimationWindow(null);
}

function testRegisterUnregisterAnimation() {
  var anim = new goog.fx.Animation([0], [1], 1000);

  goog.fx.anim.registerAnimation(anim);

  assertTrue(
      'There should be an active timer',
      goog.fx.anim.animationDelay_ && goog.fx.anim.animationDelay_.isActive());
  assertEquals(
      'There should be an active animations', 1,
      goog.object.getCount(goog.fx.anim.activeAnimations_));

  goog.fx.anim.unregisterAnimation(anim);

  assertTrue(
      'There should be no active animations',
      goog.object.isEmpty(goog.fx.anim.activeAnimations_));
  assertFalse(
      'There should be no active timer',
      goog.fx.anim.animationDelay_ && goog.fx.anim.animationDelay_.isActive());

  anim.dispose();
}

function testCycleWithMockClock() {
  goog.fx.anim.setAnimationWindow(null);
  var anim = new goog.fx.Animation([0], [1], 1000);
  anim.onAnimationFrame = goog.testing.recordFunction();

  goog.fx.anim.registerAnimation(anim);
  clock.tick(goog.fx.anim.TIMEOUT);

  assertEquals(1, anim.onAnimationFrame.getCallCount());
}

function testCycleWithMockClockAndAnimationWindow() {
  goog.fx.anim.setAnimationWindow(window);
  var anim = new goog.fx.Animation([0], [1], 1000);
  anim.onAnimationFrame = goog.testing.recordFunction();

  goog.fx.anim.registerAnimation(anim);
  clock.tick(goog.fx.anim.TIMEOUT);

  assertEquals(1, anim.onAnimationFrame.getCallCount());
}
