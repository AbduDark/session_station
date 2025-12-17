import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:session')
  handleJoinSession(client: Socket, sessionId: string) {
    client.join(`session:${sessionId}`);
    console.log(`Client ${client.id} joined session:${sessionId}`);
    return { event: 'joined', sessionId };
  }

  @SubscribeMessage('leave:session')
  handleLeaveSession(client: Socket, sessionId: string) {
    client.leave(`session:${sessionId}`);
    console.log(`Client ${client.id} left session:${sessionId}`);
    return { event: 'left', sessionId };
  }

  @SubscribeMessage('join:driver')
  handleJoinDriver(client: Socket, driverId: string) {
    client.join(`driver:${driverId}`);
    console.log(`Client ${client.id} joined driver:${driverId}`);
    return { event: 'joined', driverId };
  }

  emitSessionUpdate(session: any) {
    this.server.to(`session:${session.id}`).emit('session.updated', session);
    if (session.driverId) {
      this.server.to(`driver:${session.driverId}`).emit('session.updated', session);
    }
  }

  emitSeatBooked(session: any, seatsCount: number) {
    this.server.to(`session:${session.id}`).emit('seat.booked', {
      sessionId: session.id,
      seatsCount,
      availableSeats: session.availableSeats,
    });

    if (session.status === 'FULL') {
      this.server.to(`session:${session.id}`).emit('session.full', {
        sessionId: session.id,
      });
    }
  }

  emitSeatReleased(session: any, seatsCount: number) {
    this.server.to(`session:${session.id}`).emit('seat.released', {
      sessionId: session.id,
      seatsCount,
      availableSeats: session.availableSeats,
    });
  }

  emitPaymentSuccess(payment: any) {
    if (payment.booking?.session) {
      this.server.to(`session:${payment.booking.session.id}`).emit('payment.success', {
        paymentId: payment.id,
        bookingId: payment.bookingId,
        amount: payment.totalAmount,
      });
    }
  }
}
