import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('customers')
export class CustomerOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'full_name', length: 120 })
  fullName!: string;

  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ length: 20 })
  phone!: string;
}