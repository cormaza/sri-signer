'use strict'

/**
 * Signer NodeJS for NF-e from Brazil
 * Adapted by Alexandre Moraes @alcmoraes
 * Based on Andres Castillo @aazcast solution
 */

/**
 * Module dependencies
 */
const forge = require('node-forge');
const { Crypto } = require('@peculiar/webcrypto');
const xades = require('xadesjs');
const xmlCore = require('xml-core');
const { Convert } = require('pvtsutils');
const moment = require('moment-timezone');

// Preset
const crypto = new Crypto();
xades.Application.setEngine("OpenSSL", crypto);
moment.tz.setDefault("America/Sao_Paulo");

/**
 * Main function to sign one XML
 *
 * @param {string} xmlString XML in string.
 * @param {string} key P12 in base64
 * @param {string} pass Passphrase
*/
exports.sign = async (xmlString, key, pass) => {
  try {
    const data = await separateP12(key, pass);
    const xmlSigned = await signXML(xmlString, data.cert64, data.pkey64, data.pbkey64);
    return xmlSigned;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

exports.verifySignature = async (key, pass) => {
  try {
    const p12base64 = key;
    const passphrase = pass;
    const asn = forge.asn1.fromDer(forge.util.decode64(p12base64));
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn, true, passphrase);
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag];
    const expiresOn = certBags[0].cert.validity.notAfter;
    const date = moment().format();
    let timediff = moment(expiresOn).diff(date, 'seconds');
    if (timediff < 100000) {
      //cert is expired or expires in one day
      throw err;
    }
    return {
      isValid: true,
      expiresOn
    };
  } catch (err) {
    console.log(err);
    throw new Error('Seu certificado não atinge os requisitos mínimos para a assinatura digital.');
  }
}

/**
 * Separate p12 file in three different files necessary to sign, we return three files in base64. cert and two pem files
 *
 * @param {string} key P12 in base64
 * @param {string} pass Passphrase
*/
const separateP12 = async (key, pass) => {
  try {
    const p12base64 = key;
    const passphrase = pass;
    // We separate the p12
    const asn = forge.asn1.fromDer(forge.util.decode64(p12base64));
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn, true, passphrase);
    // We get the key data
    const keyData = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag].concat(p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]);
    // Get the private key
    const rsaPrivateKey = forge.pki.privateKeyToAsn1(keyData[0].key);
    const privateKeyInfo = forge.pki.wrapRsaPrivateKey(rsaPrivateKey);
    const pemPrivate = forge.pki.privateKeyInfoToPem(privateKeyInfo);
    const pkey64 = await pemToBase64(pemPrivate);
    // Get the cert
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag];
    const finalCert = forge.pki.certificateToPem(certBags[0].cert);
    const cert64 = await pemToBase64(finalCert)
    // Get the public key from private key
    const preprivateKey = forge.pki.privateKeyFromPem(pemPrivate);
    const prepublicKey = forge.pki.setRsaPublicKey(preprivateKey.n, preprivateKey.e);
    const publicKey = forge.pki.publicKeyToPem(prepublicKey);
    const pbkey64 = await pemToBase64(publicKey)
    // Return the data
    const data = {
      pkey64,
      cert64,
      pbkey64
    };
    return data;
  } catch (err) {
    console.log(err);
    throw new Error('Seu certificado não atinge os requisitos mínimos para a assinatura digital.');
  }
}


/**
 * The current code have been implemented in javacript using library xadesjs
 *
 * @param {string} xmlString XML to sign
 * @param {string} ct Base64 Cert
 * @param {string} pk Base64 PublicKey pem
 * @param {string} pbk Base64 PrivateKey pem
*/
const signXML = async (xmlString, ct, pk, pbk) => {
  try {
    const uuidv4 = generateId();
    const hash = "SHA-1";
    const alg = {
      name: "RSASSA-PKCS1-v1_5",
      hash: hash,
      publicExponent: new Uint8Array([1, 0, 1]),
      modulusLength: 2048,
    }
    // Read cert
    const certDer = Convert.FromBase64(ct);
    // Read public key
    const publicKeyDer = Convert.FromBase64(pbk);
    const publicKey = await crypto.subtle.importKey("spki", publicKeyDer, alg, true, ["verify"]);

    // Read private key
    const keyDer = Convert.FromBase64(pk);
    const key = await crypto.subtle.importKey("pkcs8", keyDer, alg, false, ["sign"]);

    // XAdES-EPES
    let xml = xades.Parse(xmlString);
    const xadesXml = new xades.SignedXml();
    const x509 = ct;
    const referenceId = uuidv4;

    xadesXml.XmlSignature.SignedInfo.CanonicalizationMethod.Algorithm = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"

    // Create signature
    const signature = await xadesXml.Sign(   // Signing document
      alg,                                    // algorithm
      key,                                    // key
      xml,                                    // document
      {                                       // options
        keyValue: publicKey,
        references: [
          {
            type: "http://uri.etsi.org/01903#SignedProperties",
            hash,
            transforms: [],
          },
          {
            hash,
            uri: '#comprobante',
            transforms: ['enveloped']
          }
        ],
        x509: [x509],
        signingCertificate: x509,
      });

    // append signature
    xml.documentElement.appendChild(signature.GetXml());

    // serialize XML
    const sXML = xmlCore.Stringify(xml);
    const signedXml = Buffer.from(sXML).toString("base64");
    return signedXml;

  } catch (err) {
    console.log(err)
    throw err;
  }
}

// Convert pem to base64
const pemToBase64 = (pem) => {
  return new Promise(function (resolve, reject) {
    const pemfinal = pem
      // remove BEGIN/END
      .replace(/-----(BEGIN|END)[\w\d\s]+-----/g, "")
      // remove \r, \n
      .replace(/[\r\n]/g, "");
    resolve(pemfinal);
  });
}

// Generate ID for reference id
const generateId = () => {
  return (`${1e7}-${1e3}-${4e3}-${8e3}-${1e11}`).replace(/[018]/g, (c) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1)))[0] & 15 >> c / 4).toString(16)
  );
}