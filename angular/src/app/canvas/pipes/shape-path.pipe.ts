import { Pipe, PipeTransform } from '@angular/core';
import { ShapeKind } from '../models/board-item.model';
import { shapePath } from '../utils/shape-paths';

@Pipe({ name: 'shapePath' })
export class ShapePathPipe implements PipeTransform {
  transform(kind: ShapeKind, width: number, height: number): string {
    return shapePath(kind, width, height);
  }
}
