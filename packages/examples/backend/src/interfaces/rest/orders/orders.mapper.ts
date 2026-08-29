import { CreateOrder, OrderWithCustomer } from '@fleet-sight/shared/applications/orders';
import { geoJsonPointToPoint, pointToGeoJsonPoint } from '@fleet-sight/shared/persistence';
import { injectable } from 'inversify';
import { OrderCreateRequestDto, OrderDto } from './orders.dto';

@injectable()
export class OrdersMapper {
  toDto(order: OrderWithCustomer): OrderDto {
    return {
      id: order.id,
      customer: {
        id: order.customerId,
        name: order.customerName,
      },
      orderDate: order.createdAt.toISOString(),
      scheduledAt: (order.scheduledAt ?? order.createdAt).toISOString(),
      status: order.status,
      sourceAddress: order.sourceAddress,
      sourcePoint: pointToGeoJsonPoint(order.sourcePoint),
      destinationAddress: order.destinationAddress,
      destinationPoint: pointToGeoJsonPoint(order.destinationPoint),
      weight: order.weight,
      volume: order.volume,
    };
  }

  fromCreateDto(createOrderRequestDto: OrderCreateRequestDto): CreateOrder {
    return {
      customerId: createOrderRequestDto.customerId,
      scheduledAt: createOrderRequestDto.scheduledAt !== undefined ? new Date(createOrderRequestDto.scheduledAt) : null,
      sourceAddress: createOrderRequestDto.sourceAddress,
      sourcePoint: geoJsonPointToPoint(createOrderRequestDto.sourcePoint),
      destinationAddress: createOrderRequestDto.destinationAddress,
      destinationPoint: geoJsonPointToPoint(createOrderRequestDto.destinationPoint),
      weight: createOrderRequestDto.weight,
      volume: createOrderRequestDto.volume,
      status: 'scheduled',
      createdAt: new Date(),
    };
  }
}
