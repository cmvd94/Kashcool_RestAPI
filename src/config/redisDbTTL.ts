import { createClient } from 'redis';

const redisClient = createClient({
    password: 'UgiWibAzKYWrKYQhYMYMW2VA2Q2fv6TH',
    socket: {
        host: 'redis-13885.c212.ap-south-1-1.ec2.redns.redis-cloud.com',
        port: 13885
    }
});

redisClient.on('error', err => console.log(err))

if (!redisClient.isOpen) {
  redisClient.connect()
}

export { redisClient }