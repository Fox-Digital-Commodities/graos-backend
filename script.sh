#!/bin/bash

echo "Criando as imagens ....."

docker build . --no-cache -t adventureandre/graos-backend:1.0

echo "Realizando o push das imagens ....."

docker push adventureandre/graos-backend:1.0

echo "Criando os secrets no cluster kubernetes ....."

kubectl apply -f ./secrets.yml

echo "Criando os servicos no cluster kubernetes ....."

kubectl apply -f ./services.yml

echo "Criando o deployment no cluster kubernetes ....."

kubectl apply -f ./graos-backend:1.0.yml --record
