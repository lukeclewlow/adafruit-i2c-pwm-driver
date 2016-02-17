var I2C, PWMDriver, sleep,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

I2C = require('i2c');

sleep = require('sleep');

PWMDriver = (function() {
  var i2c;

  i2c = null;

  PWMDriver.prototype.__SUBADR1 = 0x02;

  PWMDriver.prototype.__SUBADR2 = 0x03;

  PWMDriver.prototype.__SUBADR3 = 0x04;

  PWMDriver.prototype.__MODE1 = 0x00;

  PWMDriver.prototype.__PRESCALE = 0xFE;

  PWMDriver.prototype.__LED0_ON_L = 0x06;

  PWMDriver.prototype.__LED0_ON_H = 0x07;

  PWMDriver.prototype.__LED0_OFF_L = 0x08;

  PWMDriver.prototype.__LED0_OFF_H = 0x09;

  PWMDriver.prototype.__ALLLED_ON_L = 0xFA;

  PWMDriver.prototype.__ALLLED_ON_H = 0xFB;

  PWMDriver.prototype.__ALLLED_OFF_L = 0xFC;

  PWMDriver.prototype.__ALLLED_OFF_H = 0xFD;

  function PWMDriver(address, device, debug) {
    this._step2 = __bind(this._step2, this);
    this.address = address || 0x40;
    this.device = device || '/dev/i2c-1';
    this.debug = debug || false;
    this.i2c = new I2C(this.address, {
      device: this.device
    });
    if (this.debug) {
      console.log("device " + device + ", adress:" + address + ", debug:" + debug);
      console.log("Reseting PCA9685", "mode1:", this.__MODE1);
    }
    this._send(this.__MODE1, 0x00);
    if (this.debug) {
      console.log("init done");
    }
  }

  PWMDriver.prototype._send = function(cmd, values) {
    /*
        console.log "cmd #{cmd.toString(16)} values #{values}"
        sys = require('sys')
        exec = require('child_process').exec;
        puts=(error, stdout, stderr)->
          sys.puts(stdout)
        exec("i2cset -y 1 0x40 #{cmd} #{values}", puts)
    */

    var _this = this;
    if (!(values instanceof Array)) {
      values = [values];
    }
    if (this.debug) {
      console.log("cmd " + (cmd.toString(16)) + " values " + values);
    }
    return this.i2c.writeBytes(cmd, values, function(err) {
      if (err != null) {
        return console.log("Error: in I2C", err);
      }
    });
  };

  PWMDriver.prototype._read = function(cmd, length, callback) {
    return this.i2c.readBytes(cmd, length, callback);
  };

  PWMDriver.prototype.scan = function() {
    var _this = this;
    console.log("scanning I2c devices");
    return this.i2c.scan(function(err, data) {
      if (err != null) {
        console.log("error", err);
      }
      return console.log("data", data);
    });
  };

  PWMDriver.prototype._step2 = function(err, res) {
    var newmode, oldmode, prescale;
    if (err != null) {
      console.log("error", err);
      throw new Error(err);
    }
    oldmode = res[0];
    newmode = (oldmode & 0x7F) | 0x10;
    prescale = this.prescale;
    if (this.debug) {
      console.log("prescale", Math.floor(prescale), "newMode", newmode.toString(16));
    }
    this._send(this.__MODE1, newmode);
    this._send(this.__PRESCALE, Math.floor(prescale));
    this._send(this.__MODE1, oldmode);
    sleep.usleep(10000);
    return this._send(this.__MODE1, oldmode | 0x80);
  };

  PWMDriver.prototype.setPWMFreq = function(freq) {
    var prescale, prescaleval;
    prescaleval = 25000000.0;
    prescaleval /= 4096.0;
    prescaleval /= freq;
    prescaleval -= 1.0;
    if (this.debug) {
      console.log("Setting PWM frequency to " + freq + " Hz");
      console.log("Estimated pre-scale: " + prescaleval);
    }
    prescale = Math.floor(prescaleval + 0.5);
    if (this.debug) {
      console.log("Final pre-scale: " + prescale);
    }
    this.prescale = prescale;
    return this._read(this.__MODE1, 1, this._step2);
  };

  PWMDriver.prototype.setPWM = function(channel, on_, off_) {
    if (this.debug) {
      console.log("Setting PWM channel, channel: " + channel + ", on : " + on_ + " off " + off_);
    }
    this._send(this.__LED0_ON_L + 4 * channel, on_ & 0xFF);
    this._send(this.__LED0_ON_H + 4 * channel, on_ >> 8);
    this._send(this.__LED0_OFF_L + 4 * channel, off_ & 0xFF);
    return this._send(this.__LED0_OFF_H + 4 * channel, off_ >> 8);
  };

  PWMDriver.prototype.stop = function() {
    return this._send(this.__ALLLED_OFF_H, 0x01);
  };

  return PWMDriver;

})();

module.exports = PWMDriver;
