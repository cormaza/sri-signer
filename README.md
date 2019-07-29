# nfe-signer
> Implementação em Node-JS para a assinatura digital de notas fiscais eletrônicas usando certificados digitais protegidos por password.

## Créditos
- https://github.com/PeculiarVentures/xadesjs/issues/54;
- Andrés Castillo @aazcast da gravity.cr;

## Instalação
```sh
$ npm i nfe-signer --save
```

## Exemplo de uso
```js
// Define its dependency
const Signer = require('nfe-signer');

const nameController = async (req, res) => {
  try {
    // Sends to Signer.sign the XML as string, the base64 cert and the cert password;
    // It returns the signed XML
    const xml = await Signer.sign(xmlString, certAsBase64, certPassword);

    // You can also verify the signature by using Signer.verifySignature;
    const verify = await Signer.verifySignature(certAsBase64, certPassword);
    // The method returns an isValid boolean in case the cert is valid.
    { isValid: true, expiresOn: ... }

  } catch (err) {
    console.log(err);
    res.send(err);
  }
}

```


## Changelog
[CHANGELOG.md](CHANGELOG.md)

## License
The MIT License (MIT)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.