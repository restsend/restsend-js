#!/bin/sh
npm run build
rm -Rf ../restsend/demo/*
cp -R dist/* ../restsend/demo/