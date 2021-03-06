var expect = require('expect.js'),
    path = require('path'),
    spawn = require('child_process').spawn,
    http = require('http'),
    config = require('../app/config/config'),
    db = require('../app/config/db')(config),
    models = require('../app/config/models')(db),
    bl = require('bl'),
    q = require('q'),
    request = require('request'),
    range = require('range').range;

describe('REST API', function() {
  var app;
  var port = 3001;

  function testData(n) {
    n = n || 100;
    return range(0, n).map(function (i) {
      return {
        subject: 'Subject ' + i,
        message: 'Email message ' + i
      };
    });
  }

  beforeEach(function(done) {
    var Email = models.email;
    q(db.sync())
    .then(function () {
      return db.query('TRUNCATE TABLE "Emails"');
    })
    .then(function () {
      return Email.bulkCreate(testData());
    })
    .then(function () {
      app = spawn('node', [path.join(__dirname, '..', 'app', 'app.js'), port]);
      //app.stdout.pipe(process.stdout);
      //app.stderr.pipe(process.stderr);
      app.stdout.once('data', function () {
        done();
      });
    })
    .fail(function (err) {
      console.log(err);
      done(err);
    });
  });

  afterEach(function (done) {
    app.kill();
    app.on('close', function (code) {
      done();
    });
  });

  it('should be able to connect to the REST server', function(done) {
    http.get('http://localhost:' + port, function (res) {
      res.pipe(bl(function (err, data) {
        expect(data.toString()).to.equal('main index');
        done();
      }));
    })
    .on('error', done);
  });

  it('should be able to retrieve an email', function(done) {
    var Email = models.email;
    q(Email.find({ where: { subject: 'Subject 42' } }))
    .then(function (email) {
      request('http://localhost:' + port + '/email/' + email.id, { json: true },
        function (err, res, body) {
          if (err) return done(err);
          expect(body.subject).to.equal('Subject 42');
          expect(body.message).to.equal('Email message 42');
          expect(body.id).to.equal(email.id);
          done();
        });
    });
  });

  it('should be able to create a new email', function(done) {
    request.post({
        url: 'http://localhost:' + port + '/email/',
        body: {
          subject: 'New subject',
          message: 'New message'
        },
        json: true
      },
      function (err, res, body) {
        if (err) return done(err);
        expect(res.statusCode).to.equal(200);
        expect(body.subject).to.equal('New subject');
        expect(body.message).to.equal('New message');
        expect(body.id).to.be.greaterThan(0);
        done();
      });
  });

  it('should be able to get a list of emails', function(done) {
    request('http://localhost:' + port + '/email', { json: true },
      function (err, res, body) {
        if (err) return done(err);
        expect(body.length).to.equal(100);
        body.forEach(function (email) {
          expect(email.subject).to.match(/^Subject [0-9]+$/);
          expect(email.message).to.match(/^Email message [0-9]+$/);
          expect(email.id).to.be.greaterThan(0);
        });
        done();
      });
  });

  it('should be able to delete an email', function(done) {
    var Email = models.email;
    q(Email.find({ where: { subject: 'Subject 42' } }))
    .then(function (email) {
      request.del('http://localhost:' + port + '/email/' + email.id, { json: true },
        function (err, res, body) {
          if (err) return done(err);
          expect(body.msg).to.equal('Item successfully deleted');
          done();
        });
    });
  });

  it('should be able to update an email', function(done) {
    var Email = models.email;
    q(Email.find({ where: { subject: 'Subject 42' } }))
    .then(function (email) {
      request.put('http://localhost:' + port + '/email/' + email.id, {
          body: {
            subject: 'Changed Subject 42'
          },
          json: true
        },
        function (err, res, body) {
          if (err) return done(err);
          expect(body.subject).to.equal('Changed Subject 42');
          expect(body.message).to.equal('Email message 42');
          expect(body.id).to.equal(email.id);

          Email.find(email.id)
            .success(function (_email) {
              expect(_email.subject).to.equal('Changed Subject 42');
              expect(_email.message).to.equal('Email message 42');
              expect(_email.id).to.equal(email.id);
              done();
            })
            .failure(done);
        });
    });
  });
});
