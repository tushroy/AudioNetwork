'use strict';

function computeDiscreteFourierTransform(
    timeDomain, frequencyBinSamplePerPeriodMax, frequencyBinSamplePerPeriodMin, frequencyBinSize
) {
    var frequencyDomain, step, i, samplePerPeriod, frequencyBin;

    frequencyDomain = [];
    step = (frequencyBinSamplePerPeriodMax - frequencyBinSamplePerPeriodMin) / frequencyBinSize;
    for (i = 0; i < frequencyBinSize; i++) {
        samplePerPeriod = frequencyBinSamplePerPeriodMax - i * step;
        frequencyBin = getFrequencyBin(timeDomain, samplePerPeriod);
        frequencyDomain.push(frequencyBin);
    }

    return frequencyDomain;
}

function findUnitAngle(x, y) {
    var length, quarter, angle;

    length = Math.sqrt(x * x + y * y);
    length = (length < 0.000001) ? 0.000001 : length;    // prevents from dividing by zero
    quarter = (x >= 0) ? (y >= 0 ? 0 : 1) : (y < 0 ? 2 : 3);
    switch (quarter) {
        case 0:
            angle = Math.asin(x / length);
            break;
        case 1:
            angle = Math.asin(-y / length) + 0.5 * Math.PI;
            break;
        case 2:
            angle = Math.asin(-x / length) + Math.PI;
            break;
        case 3:
            angle = Math.asin(y / length) + 1.5 * Math.PI;
            break;
    }

    return angle / (2 * Math.PI);   // return angle in range: <0, 1)
}

function getFrequencyBin(timeDomain, samplePerPeriod) {
    var windowSize, real, imm, i, sample, r, power, powerDecibel, phase;

    windowSize = timeDomain.length;            // timeDomain array length is our window size
    real = 0;
    imm = 0;
    for (i = 0; i < windowSize; i++) {
        sample = timeDomain[i];
        r = 2 * Math.PI * i / samplePerPeriod; // compute radians for 'unit vector' sine/cosine
        real += -Math.cos(r) * sample;         // 'sample' value alters 'unit vector' length, it could also change
        imm += Math.sin(r) * sample;           // direction of vector in case of negative 'sample' values
    }
    real /= windowSize;                        // normalize final vector
    imm /= windowSize;                         // normalize final vector

    power = Math.sqrt(real * real + imm * imm);                 // compute length of the vector
    powerDecibel = 10 * Math.log(power) / Math.LN10;            // convert into decibels
    powerDecibel = powerDecibel < -100 ? -100 : powerDecibel;   // limit weak values to -100 decibels

    phase = findUnitAngle(real, imm);          // get angle between vector and positive Y axis clockwise

    return {
        powerDecibel: powerDecibel,
        phase: phase
    };
}

function blackmanNuttall(n, N) {
    return 0.3635819
        - 0.4891775 * Math.cos(2 * Math.PI * n / (N - 1))
        + 0.1365995 * Math.cos(4 * Math.PI * n / (N - 1))
        - 0.0106411 * Math.cos(6 * Math.PI * n / (N - 1));
}

function generateSineWave(samplePerPeriod, amplitude, degreesPhaseOffset, sample) {
    var unitPhaseOffset = degreesPhaseOffset / 360;

    return amplitude * Math.sin(2 * Math.PI * (sample / samplePerPeriod - unitPhaseOffset));
}

// ------------------------------------------------------------------

function generateTimeDomain(windowSize, whiteNoiseAmplitude) {
    var i, timeDomain, sample, sampleProcessed;

    timeDomain = [];
    for (i = 0; i < windowSize; i++) {
        sample = 0;
        sample += generateSineWave(28, 0.3, 0, i); // sine A: samplePerPeriod 28, amplitude 0.3, degreesPhaseOffset 0
        sample += generateSineWave(20, 0.3, 0, i); // sine B: samplePerPeriod 20, amplitude 0.3, degreesPhaseOffset 0
        sample += generateSineWave(16, 0.3, 0, i); // sine C: samplePerPeriod 16, amplitude 0.3, degreesPhaseOffset 0
        sample += (-1 + 2 * Math.random()) * whiteNoiseAmplitude;    // add white noise
        sampleProcessed = sample * blackmanNuttall(i, windowSize);   // apply window function
        timeDomain.push(sampleProcessed);                            // push processed sample to array
    }

    return timeDomain;
}

function logger(s) {
    var element = document.getElementById('dft-output');

    element.innerHTML = element.innerHTML + s + '\n';
}

function logPowerDecibel(
    frequencyDomain, index, frequencyBinSamplePerPeriodMax, frequencyBinSamplePerPeriodMin, frequencyBinSize
) {
    var powerDecibelTwoDecimalPlaces, step, samplePerPeriod;

    step = (frequencyBinSamplePerPeriodMax - frequencyBinSamplePerPeriodMin) / frequencyBinSize;
    samplePerPeriod = frequencyBinSamplePerPeriodMax - step * index;
    powerDecibelTwoDecimalPlaces = Math.round(frequencyDomain[index].powerDecibel * 100) / 100;

    logger('[' + index + '] ' + powerDecibelTwoDecimalPlaces + ' dB | samplePerPeriod: ' + samplePerPeriod);
}

function logPhase(frequencyDomain, index) {
    var phaseInDegrees = Math.round(frequencyDomain[index].phase * 360);

    phaseInDegrees = phaseInDegrees % 360; // normalize
    logger(phaseInDegrees + ' degrees');
}

// ------------------------------------------------------------------

function init() {
    var i, frequencyDomain, timeDomain, windowSize, whiteNoiseAmplitude,
        frequencyBinSamplePerPeriodMin, frequencyBinSamplePerPeriodMax, frequencyBinSize;

    windowSize = 1024;
    whiteNoiseAmplitude = 0;
    timeDomain = generateTimeDomain(windowSize, whiteNoiseAmplitude);

    frequencyBinSamplePerPeriodMax = 50;
    frequencyBinSamplePerPeriodMin = 10;
    frequencyBinSize = 160;
    frequencyDomain = computeDiscreteFourierTransform(
        timeDomain, frequencyBinSamplePerPeriodMax, frequencyBinSamplePerPeriodMin, frequencyBinSize
    );

    logger('timeDomain.length: ' + timeDomain.length);
    logger('frequencyDomain.length: ' + frequencyDomain.length);

    for (i = 0; i < frequencyDomain.length; i++) {
        logPowerDecibel(
            frequencyDomain, i, frequencyBinSamplePerPeriodMax, frequencyBinSamplePerPeriodMin, frequencyBinSize
        );
    }

    logger('----');

    logger('Sine A phase offset:');
    logPhase(frequencyDomain, 88);

    logger('Sine B phase offset:');
    logPhase(frequencyDomain, 120);

    logger('Sine C phase offset:');
    logPhase(frequencyDomain, 136);
}
