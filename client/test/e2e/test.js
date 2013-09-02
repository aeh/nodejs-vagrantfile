var protractor = require('protractor'),
    expect = require('expect.js');

describe('homepage', function() {
  it("should say 'Allo, 'Allo!", function(done) {
    var ptor = this.ptor;

    ptor.get('http://localhost:9000/');
    ptor.findElement(protractor.By.tagName('h1')).
      getText().then(function(text) {
        expect(text).to.equal("'Allo, 'Allo!");
        done();
      });
  });
});
