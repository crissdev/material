describe('CodepenDataAdapter', function() {

  var codepenDataAdapter, demo, data, externalScripts;
  beforeEach(module('docsApp'));

  beforeEach(inject(function(_codepenDataAdapter_) {
    codepenDataAdapter = _codepenDataAdapter_;
  }));

  beforeEach(function() {
    externalScripts = [
      'http://some-url-to-external-js-files-required-for-codepen'
    ];

    demo = {
      id: 'spec-demo',
      title: 'demo-title',
      module: 'demo-module',
      index: '<div></div>',
      css: ['.fake-class { color: red }'],
      js: ['angular.module("SomeOtherModule", ["Dependency1"]);'],
      html: []
    };
  });

  describe('#translate', function() {

    describe('the most common usage', function() {
      beforeEach(function() {
        data = codepenDataAdapter.translate(demo, externalScripts);
      });

      it('provides the title of the codepen', function() {
        expect(data.title).toBe(demo.title);
      });

      it('includes the core angular css', function() {
        expect(data.css_external).toBe('https://cdn.rawgit.com/angular/bower-material/master/angular-material.css');
      });

      it('includes the external js files, including the asset cache required to serve svgs to codepen', function() {

        var expected = [
          'http://some-url-to-external-js-files-required-for-codepen',
          'https://cdn.rawgit.com/angular/bower-material/master/angular-material.js',
          'https://s3-us-west-2.amazonaws.com/s.cdpn.io/t-114/assets-cache.js'
        ].join(';');
        expect(data.js_external).toBe(expected)
      });

      it('adds ng-app attribute to the index', function() {
        expect(angular.element(data.html).attr('ng-app')).toBe('MyApp');
      });

      it('adds the demo id as a class attribute to the parent element on the index.html', function() {
        expect(angular.element(data.html).hasClass(demo.id)).toBe(true);
      });

      it('replaces the demo module with the codepen module', function() {
        expect(data.js).toBe("angular.module('MyApp');");
      });

      it('includes the demo css', function() {
        expect(data.css).toBe('.fake-class { color: red }');
      });
    });

    describe('when html templates are included in the demo', function() {

      var template, script;
      beforeEach(function() {
        template = {
          name: 'template-name',
          contents: "<div class='foo'>{{bar}}</div>"
        };

        demo.html.push(template);

        data = codepenDataAdapter.translate(demo, externalScripts);

        script = angular.element(data.html).find('script');
      });

      it('appends the template to the index', function() {
        expect(script.html()).toBe(template.contents);
      });

      it('adds the ngTemplate to the script tag', function() {
        expect(script.attr('type')).toBe('text/ng-template');
      });

      it('adds the template name as the id', function() {
        expect(script.attr('id')).toBe(template.name);
      });
    });

    describe('when the demo html includes a <code> block', function() {

      it('escapes the ampersand, so that codepen does not unescape the angle brackets', function() {
        demo.index = '<div><code>&gt;md-autocomplete&lt;</code></div>';
        data = codepenDataAdapter.translate(demo, externalScripts);
        expect(angular.element(data.html).html()).toBe('<code>&amp;gt;md-autocomplete&amp;lt;</code>');
      });

      it('handles multiple code blocks', function() {
        demo.index = '<div><code>&gt;md-autocomplete&lt;</code><code>&gt;md-input&lt;</code></div>';
        data = codepenDataAdapter.translate(demo, externalScripts);
        expect(angular.element(data.html).html()).toBe('<code>&amp;gt;md-autocomplete&amp;lt;</code><code>&amp;gt;md-input&amp;lt;</code>');
      });

    });

    describe('when the html example includes &nbsp;', function() {

      it('escapes the ampersand, so that the codepen does not translate to an invalid character', function() {
        demo.index = '<div>&nbsp;&nbsp;</div>';
        data = codepenDataAdapter.translate(demo, externalScripts);
        expect(angular.element(data.html).html()).toBe('&amp;nbsp;&amp;nbsp;');
      });
    });

    describe('when the module definition in the js file is formatted in different ways', function() {

      it('handles second argument on a new line', function() {
        shouldReplaceModuleOnSingleLine("angular.module('test',\n \
[]);");
      });

      it('handles dependencies on new lines', function() {
        shouldReplaceModuleOnSingleLine("angular.module('test', [\n \
'Dep1',\n \
'Dep2',\n \
]);");
      });

      it('handles module on a new line', function() {
        shouldReplaceMultilineModule("angular\n\
.module('test', [\n \
'Dep1',\n \
'Dep2',\n \
]);");
      });

      it("handles html escaped javascript", function() {
        shouldReplaceModuleOnSingleLine('angular.module(&apos;app&apos;, [&apos;ngMaterial&apos;]);');
      });

      it("handles html escaped javascript", function() {
        shouldReplaceModuleOnSingleLine('angular.module(&quot;app&quot;, [&apos;ngMaterial&apos;]);');
      });

      function shouldReplaceModuleOnSingleLine(script) {
        demo.js = [script];

        data = codepenDataAdapter.translate(demo, externalScripts);
        expect(data.js).toBe("angular.module('MyApp');");
      };

      function shouldReplaceMultilineModule(script) {
        demo.js = [script];

        data = codepenDataAdapter.translate(demo, externalScripts);
        expect(data.js).toBe("angular\n\
.module('MyApp');");
      };
    });
  });
});
