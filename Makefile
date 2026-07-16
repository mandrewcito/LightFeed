.PHONY: build package package-linux package-mac package-win clean

build:
	npm run build

package: build
	npm run package

package-linux: build
	npm run package:linux

package-mac: build
	npm run package:mac

package-win: build
	npm run package:win

clean:
	rm -rf out/ dist/
