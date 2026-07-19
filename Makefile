.PHONY: dev build check clean package-linux package-mac package-win

dev:
	npm run dev

build:
	npm run build

check:
	cd src-tauri && cargo check

package-linux:
	npm run build
	npx tauri build --bundles deb

package-mac:
	npm run build
	npx tauri build --bundles dmg,app

package-win:
	npm run build
	npx tauri build --bundles nsis

clean:
	rm -rf dist/ src-tauri/target/
