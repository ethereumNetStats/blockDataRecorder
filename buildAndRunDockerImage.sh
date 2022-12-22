#!/bin/bash
docker build -t ethereum_block_data_recorder .
docker save ethereum_block_data_recorder:latest > ethereum_block_data_recorder.tar
sudo docker stop ethereum_block_data_recorder
sudo docker ps -a -q -f name=ethereum_block_data_recorder | xargs sudo docker rm
sudo docker rmi ethereum_block_data_recorder:latest
sudo docker load < ethereum_block_data_recorder.tar
sudo docker run -d --name ethereum_block_data_recorder ethereum_block_data_recorder:latest
