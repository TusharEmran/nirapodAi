function generateOtpCode(length = 6) {
    const min = 10 ** (length - 1);
    const max = 10 ** length - 1;
    return String(Math.floor(min + Math.random() * (max - min + 1)));
}

function buildOtpExpiry(minutes = 10) {
    return new Date(Date.now() + minutes * 60 * 1000);
}

module.exports = {
    generateOtpCode,
    buildOtpExpiry,
};
