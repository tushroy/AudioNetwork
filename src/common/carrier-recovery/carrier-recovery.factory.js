// Copyright (c) 2015-2016 Robert Rypuła - https://audio-network.rypula.pl
(function () {
    'use strict';

    AudioNetwork.Injector
        .registerFactory('Common.CarrierRecovery', _CarrierRecovery);

    _CarrierRecovery.$inject = [
        'Common.QueueBuilder',
        'Common.MathUtil',
        'Common.Util'
    ];

    function _CarrierRecovery(
        QueueBuilder,
        MathUtil,
        Util
    ) {
        var CarrierRecovery;

        CarrierRecovery = function (samplePerPeriod, dftWindowSize) {
            this.$$queue = QueueBuilder.build(2 * dftWindowSize);
            this.$$queueSumReal = 0;
            this.$$queueSumImm = 0;
            this.$$referenceReal = 0;
            this.$$referenceImm = 0;
            this.$$real = 0;
            this.$$imm = 0;
            this.$$power = 0;
            this.$$powerDecibel = 0;
            this.$$phase = 0;

            this.$$samplePerPeriod = null;
            this.$$omega = null;
            this.$$sampleNumber = 0;
            this.setSamplePerPeriod(samplePerPeriod);
        };

        CarrierRecovery.prototype.$$computeReference = function () {
            var x = this.$$omega * this.$$sampleNumber;

            this.$$referenceReal = -MathUtil.cos(x);
            this.$$referenceImm = MathUtil.sin(x);
        };

        CarrierRecovery.prototype.$$computeAverage = function (sample) {
            var real, imm, n;

            if (this.$$queue.isFull()) {
                this.$$queueSumReal -= this.$$queue.pop();
                this.$$queueSumImm -= this.$$queue.pop();
            }
            real = this.$$referenceReal * sample;
            imm = this.$$referenceImm * sample;
            this.$$queue.push(real);
            this.$$queue.push(imm);
            this.$$queueSumReal += real;
            this.$$queueSumImm += imm;

            n = this.$$queue.getSize() >>> 1;
            this.$$real = this.$$queueSumReal / n;
            this.$$imm = this.$$queueSumImm / n;
        };

        CarrierRecovery.prototype.$$computePower = function () {
            this.$$power = MathUtil.sqrt(
                this.$$real * this.$$real +
                this.$$imm * this.$$imm
            );
            this.$$powerDecibel = 10 * MathUtil.log(this.$$power) / MathUtil.LN10;
        };

        CarrierRecovery.prototype.$$computePhase = function () {
            this.$$phase = Util.findUnitAngle(this.$$real, this.$$imm);
        };

        CarrierRecovery.prototype.handleSample = function (sample) {
            this.$$computeReference();
            this.$$computeAverage(sample);

            this.$$sampleNumber++;
        };

        CarrierRecovery.prototype.getCarrierDetail = function () {
            this.$$computePower();
            this.$$computePhase();

            return {
                phase: this.$$phase,
                power: this.$$power,
                powerDecibel: this.$$powerDecibel
            };
        };

        CarrierRecovery.prototype.setSamplePerPeriod = function (samplePerPeriod) {
            if (samplePerPeriod === this.$$samplePerPeriod) {
                return false;
            }
            this.$$samplePerPeriod = samplePerPeriod;
            this.$$omega = MathUtil.TWO_PI / this.$$samplePerPeriod;  // revolutions per sample
            this.$$sampleNumber = 0;

            return true;
        };

        return CarrierRecovery;
    }

})();
